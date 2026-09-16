#!/usr/bin/env node
// scripts/local-rank.mjs
// ---------------------------------------------------------------------------
// Competitor analysis for a local search term: the top 5 competing businesses
// (matched by category family, filled from the ranked list when fewer than 5
// share the category) side by side with the business under test, plus
// evidence-bearing suggestions -> a markdown section for the complimentary
// website report.
//
// Data source: Google Maps Platform.
//   - Geocoding API resolves the area centre (city/zip -> lat/lng).
//   - Places API (New) Text Search (POST .../v1/places:searchText) returns
//     results in Google's own relevance order for that query from that
//     point - that order IS the local ranking. No scraping of Google Maps
//     or Search (ToS).
//
// Results are paginated via nextPageToken up to 3 pages of 20 (60 total,
// Google's own cap) - or fewer pages when --depth 20/40 asks for less.
//
// When a term's searched depth does not contain the business, ONE extra Text
// Search (textQuery: "<name> <place>") looks up the business's OWN Google profile
// directly, so an unranked business that nonetheless has a verified profile
// is never told to "claim/verify" a profile it already has. Each term's JSON
// carries `ownProfile` (null when no own profile was found or none looked
// up because the business already ranked): { found, name, rating,
// reviewCount, photoCount, primaryCategory, hoursListed, website, placeId,
// hasDescription, distanceMi }.
//
// Competitor analysis (H05): each term's JSON also carries `competitors` (up
// to `--top`, default 5, businesses whose primary category matches "the
// term's service" - the category shared by at least 2 results, else the
// top-ranked result's category; when fewer than that many share it, the
// ranked list fills the rest, each flagged `categoryMatch`), a unified
// `client` row (the business under test, same attribute shape as a
// competitor, `position` 1-60 or null, `status: "not showing"` only when
// truly absent - no ranking AND no own profile), and `topCompetitor` (the
// single highest-ranked OTHER business, regardless of category match, for
// the report's page-1 call-out line). Suggestions compare the client against
// the competitor set on reviews, photos, primary category, hours, website,
// and business description - never fabricated when there is nothing to
// compare against (a business with no discoverable profile at all gets the
// claim/verify line only, not five guessed gaps against businesses it may
// not even compete head-to-head with).
//
// Node built-ins only. No npm deps. Secrets are read from an env file
// (default .env.local in CWD), held in memory only, and NEVER printed or
// logged - not even in --dry-run output or error messages.
//
// Usage:
//   node scripts/local-rank.mjs --domain <domain> --terms "<term>;<term>" \
//     --place "<City, GA | zip>" --out <path.md> \
//     [--json <path>] [--env <path>] [--name <business name>] \
//     [--radius-km 15] [--top 5] [--depth 60] [--dry-run]
//
// Exit codes: 0 ok · 1 bad input / missing env · 2 Google API failure.
// ---------------------------------------------------------------------------

import { readFileSync, writeFileSync } from "node:fs";
import process from "node:process";
import { pathToFileURL } from "node:url";

export const NA = "—"; // em dash - the ONLY placeholder for a null/absent value
export const NOT_IN_TOP_60 = "not in top 60";
export const NOT_SHOWING = "not showing"; // client.status: no rank AND no own profile found
export const NOT_SHOWING_LABEL = "NOT SHOWING"; // table rank-cell label whenever client.position is null

const GEOCODE_HOST = "https://maps.googleapis.com/maps/api/geocode/json";
const PLACES_HOST = "https://places.googleapis.com/v1";
const DEFAULT_RADIUS_KM = 15;
const DEFAULT_TOP = 5; // number of competitors shown/compared against (H05; was 3)
const SEARCH_PAGE_SIZE = 20;
const DEFAULT_DEPTH = 60;
const VALID_DEPTHS = new Set([20, 40, 60]);
const MAX_PAGES = 3;
const PAGE_TOKEN_DELAY_MS = 2000; // Google's own guidance: a nextPageToken needs a short delay before it's valid.
const OWN_PROFILE_PAGE_SIZE = 5;
const EARTH_RADIUS_KM = 6371;
const KM_TO_MILES = 0.621371;

const REQUIRED_ENV_KEYS = ["GOOGLE_MAPS_API_KEY"];

export const GOOGLE_GUIDANCE_URL = "https://support.google.com/business/answer/7091";
export const GOOGLE_GUIDANCE_BLOCK = [
  '**Google\'s guidance on local ranking** (source: "How to improve your local ranking on Google"): ' +
    "ranking is based on relevance, distance, and prominence. Complete your business information, " +
    "verify your business, keep your hours accurate, manage and respond to reviews, and add photos " +
    "and posts about your products/services.",
  `Source: ${GOOGLE_GUIDANCE_URL}`
].join("\n");

// Fields requested from the Places API - order matches the handoff's field
// mask so the two are easy to diff by eye. `location` (H05) powers the
// competitor/client distance-from-anchor figure.
export const PLACE_FIELDS = [
  "id",
  "displayName",
  "formattedAddress",
  "websiteUri",
  "rating",
  "userRatingCount",
  "types",
  "primaryType",
  "primaryTypeDisplayName",
  "regularOpeningHours",
  "photos",
  "businessStatus",
  "googleMapsUri",
  "editorialSummary",
  "location"
];

export const SEARCH_FIELD_MASK = PLACE_FIELDS.map((f) => `places.${f}`).join(",");
export const DETAILS_FIELD_MASK = PLACE_FIELDS.join(",");

const TABLE_HEADER =
  "| Rank | Business | Rating | Reviews | Photos | Primary category | Hours listed | Website |";
const TABLE_SEP = "|---|---|---|---|---|---|---|---|";

// --------------------------------------------------------------------------
// Small helpers
// --------------------------------------------------------------------------

function toNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

function mean(values) {
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/** The value with the highest count among `values`, plus that count (0 when the list is empty). */
function bestValueCount(values) {
  const counts = new Map();
  for (const v of values) counts.set(v, (counts.get(v) || 0) + 1);
  let best = null;
  let bestCount = 0;
  for (const [v, c] of counts) {
    if (c > bestCount) {
      best = v;
      bestCount = c;
    }
  }
  return { value: best, count: bestCount };
}

/** The category shared by at least 2 of the given values, else null (never guesses a majority of 1). */
function majorityValue(values) {
  const { value, count } = bestValueCount(values);
  return count >= 2 ? value : null;
}

function numOrZero(value) {
  return value === null || value === undefined ? 0 : value;
}

function fail(message, code) {
  process.stderr.write(`${message}\n`);
  process.exit(code);
}

// --------------------------------------------------------------------------
// Pure pieces (exported for tests)
// --------------------------------------------------------------------------

/**
 * Split a `;`-separated --terms value into trimmed, non-empty terms.
 * Throws when nothing usable survives - never guesses a term.
 */
export function parseTermList(raw) {
  const terms = String(raw ?? "")
    .split(";")
    .map((t) => t.trim())
    .filter(Boolean);
  if (terms.length === 0) {
    throw new Error('--terms produced no usable terms (expected a ";"-separated list)');
  }
  return terms;
}

/**
 * Minimal .env parser (same style as keyword-volumes.mjs / get-google-ads-refresh-token.mjs):
 * skips blanks/comments, tolerates an `export ` prefix, strips matched quotes.
 * Never logs anything it reads.
 */
export function parseEnvFile(text) {
  const out = {};
  for (const raw of String(text ?? "").split("\n")) {
    let line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    if (line.startsWith("export ")) line = line.slice("export ".length).trim();
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    if (!key) continue;
    let val = line.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"') && val.length >= 2) ||
      (val.startsWith("'") && val.endsWith("'") && val.length >= 2)
    ) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

/**
 * "<city or zip>" -> the Geocoding API `address` param. A place that already
 * names a state (contains a comma, e.g. "Marietta, GA") is left as-is; a
 * bare city/zip gets ", GA" appended (Northvalley's market is Georgia).
 */
export function geocodeAddressParam(place) {
  const trimmed = String(place ?? "").trim();
  return trimmed.includes(",") ? trimmed : `${trimmed}, GA`;
}

/** Kilometers -> meters, for the Places API locationBias circle radius. */
export function kmToMeters(km) {
  return Math.round(toNumber(km) * 1000);
}

/**
 * Great-circle distance in miles between two {latitude, longitude} points
 * (haversine formula), rounded to 1 decimal. Null when either point is
 * missing/unparseable - never a guessed distance.
 */
export function haversineMiles(a, b) {
  const lat1 = a ? toNumber(a.latitude) : null;
  const lon1 = a ? toNumber(a.longitude) : null;
  const lat2 = b ? toNumber(b.latitude) : null;
  const lon2 = b ? toNumber(b.longitude) : null;
  if (lat1 === null || lon1 === null || lat2 === null || lon2 === null) return null;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const km = EARTH_RADIUS_KM * 2 * Math.asin(Math.sqrt(h));
  return Math.round(km * KM_TO_MILES * 10) / 10;
}

/** The Places API searchText request body for one term, from a resolved centre. */
export function searchTextBody(term, center, radiusKm) {
  return {
    textQuery: term,
    locationBias: {
      circle: {
        center,
        radius: kmToMeters(radiusKm)
      }
    },
    pageSize: SEARCH_PAGE_SIZE,
    rankPreference: "RELEVANCE"
  };
}

/**
 * The Places API searchText request body to fetch the NEXT page of a prior
 * search. Google requires a paging request's other parameters to match the
 * initial request exactly ("Request parameters for paging requests must
 * match the initial SearchText request") - so this repeats searchTextBody's
 * fields and adds pageToken, rather than sending pageToken alone.
 */
export function nextPageBody(term, center, radiusKm, pageToken) {
  return { ...searchTextBody(term, center, radiusKm), pageToken };
}

/** How many pages of SEARCH_PAGE_SIZE this depth needs, capped at MAX_PAGES (60/20 = 3). */
export function pagesForDepth(depth) {
  return Math.min(MAX_PAGES, Math.ceil(depth / SEARCH_PAGE_SIZE));
}

const defaultSleep = (ms) => new Promise((resolve) => globalThis.setTimeout(resolve, ms));

/**
 * Merge up to `pagesForDepth(depth)` pages of Places Text Search results into
 * one list, capped at `depth`. `fetchPage(body)` -> { places, nextPageToken }
 * is injected so tests can simulate paging without real network calls or
 * timers; `sleep` is injected the same way. When a page fetched with a
 * pageToken comes back with no places (the token was not valid yet), retry
 * that SAME page once after `PAGE_TOKEN_DELAY_MS` - never more than once.
 */
export async function fetchSearchPages({ term, center, radiusKm, depth, fetchPage, sleep = defaultSleep }) {
  const maxPages = pagesForDepth(depth);
  let allPlaces = [];
  let pageToken = null;
  for (let page = 0; page < maxPages; page += 1) {
    const body = pageToken
      ? nextPageBody(term, center, radiusKm, pageToken)
      : searchTextBody(term, center, radiusKm);
    let result = await fetchPage(body);
    if (pageToken && (!result.places || result.places.length === 0)) {
      await sleep(PAGE_TOKEN_DELAY_MS);
      result = await fetchPage(body);
    }
    allPlaces = allPlaces.concat(result.places || []);
    pageToken = result.nextPageToken || null;
    if (!pageToken || allPlaces.length >= depth) break;
  }
  return allPlaces.slice(0, depth);
}

/** Host of a URL, lowercased and www-insensitive; null when unparseable/absent. */
export function hostFromUrl(url) {
  if (!url) return null;
  try {
    return new globalThis.URL(String(url)).hostname
      .replace(/^www\./i, "")
      .toLowerCase();
  } catch {
    return null;
  }
}

/** A domain string normalized the same way as hostFromUrl, for comparison. */
export function normalizeDomain(domain) {
  return String(domain ?? "")
    .trim()
    .replace(/^www\./i, "")
    .toLowerCase();
}

function displayNameOf(place) {
  const dn = place && place.displayName;
  if (dn && typeof dn === "object") return dn.text ?? null;
  return dn ?? null;
}

/**
 * Find the business among Places API results: websiteUri host equals
 * --domain (www-insensitive) first, else displayName equals --name.
 * Returns the index within `results`, or null when neither matches -
 * never a guessed rank.
 */
export function matchBusiness(results, domain, name) {
  const list = results ?? [];
  const wantDomain = domain ? normalizeDomain(domain) : null;
  if (wantDomain) {
    for (let i = 0; i < list.length; i += 1) {
      const host = hostFromUrl(list[i] && list[i].websiteUri);
      if (host && host === wantDomain) return i;
    }
  }
  const wantName = name ? String(name).trim().toLowerCase() : null;
  if (wantName) {
    for (let i = 0; i < list.length; i += 1) {
      const dn = displayNameOf(list[i]);
      if (dn && String(dn).trim().toLowerCase() === wantName) return i;
    }
  }
  return null;
}

/**
 * Case/punctuation-insensitive name normalization for the own-profile match
 * only (matchBusiness's exact-name fallback for the top-20 table is left
 * untouched - this is a separate, looser comparison for the dedicated
 * own-profile lookup).
 */
export function normalizeNameForMatch(name) {
  return String(name ?? "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

/**
 * Find the business's own profile among a dedicated "<name> <place>" Text
 * Search's results: websiteUri host equals --domain (www-insensitive) first,
 * else displayName equals --name/--domain-label, case/punctuation-insensitive.
 * Returns the index within `results`, or null when neither matches - never a
 * guessed match.
 */
export function matchOwnProfile(results, domain, name) {
  const list = results ?? [];
  const wantDomain = domain ? normalizeDomain(domain) : null;
  if (wantDomain) {
    for (let i = 0; i < list.length; i += 1) {
      const host = hostFromUrl(list[i] && list[i].websiteUri);
      if (host && host === wantDomain) return i;
    }
  }
  const wantName = name ? normalizeNameForMatch(name) : null;
  if (wantName) {
    for (let i = 0; i < list.length; i += 1) {
      const dn = displayNameOf(list[i]);
      if (dn && normalizeNameForMatch(dn) === wantName) return i;
    }
  }
  return null;
}

/**
 * "<domain>" -> a human label for the own-profile search query, used only
 * when --name is absent: the registrable label (second-level domain),
 * title-cased. E.g. "northvalleyintel.com" -> "Northvalleyintel".
 */
export function domainLabel(domain) {
  const host = normalizeDomain(domain);
  const label = host.split(".")[0] || host;
  return label
    .split(/[-_]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

/** The business name to use for the own-profile search query: --name, else the domain's registrable label. */
export function resolveBusinessName(name, domain) {
  const trimmed = name ? String(name).trim() : "";
  return trimmed || domainLabel(domain);
}

/** The Places API searchText request body for the dedicated own-profile lookup. */
export function ownProfileSearchBody(name, place) {
  return {
    textQuery: `${name} ${place}`,
    pageSize: OWN_PROFILE_PAGE_SIZE
  };
}

/**
 * Pull the raw, typed fields this script reasons about out of one Places API
 * result. Every field is null when the API omitted it - nothing is ever
 * fabricated. `photoCapped` marks a photos array at the API's 10-item cap.
 */
export function extractPlaceData(place) {
  if (!place) return null;
  const photos = Array.isArray(place.photos) ? place.photos : null;
  const photoCount = photos ? photos.length : null;
  const primaryCategory =
    (place.primaryTypeDisplayName && place.primaryTypeDisplayName.text) ||
    place.primaryType ||
    null;
  return {
    name: displayNameOf(place),
    rating: toNumber(place.rating),
    reviewCount: toNumber(place.userRatingCount),
    photoCount,
    photoCapped: photoCount === 10,
    primaryCategory,
    hasHours: Boolean(place.regularOpeningHours),
    hasWebsite: Boolean(place.websiteUri),
    websiteUri: place.websiteUri ?? null,
    placeId: place.id ?? null
  };
}

/**
 * The `ownProfile` JSON record for one Places API result matched as the
 * business's own profile - null when there is no match (never fabricated).
 * `hasDescription`/`distanceMi` (H05) reuse the same attribute vocabulary as
 * a competitor row so `buildClientRow` can copy them across directly.
 */
export function extractOwnProfile(place, center) {
  if (!place) return null;
  const data = extractPlaceData(place);
  return {
    found: true,
    name: data.name,
    rating: data.rating,
    reviewCount: data.reviewCount,
    photoCount: data.photoCount,
    primaryCategory: data.primaryCategory,
    hoursListed: data.hasHours,
    website: data.websiteUri,
    placeId: data.placeId,
    hasDescription: Boolean(place.editorialSummary),
    distanceMi: haversineMiles(center, place.location)
  };
}

/**
 * The recommendations' first line when the business's own profile was found
 * but does not rank for this term - concrete numbers only, em dash for any
 * field the profile lacks.
 */
export function ownProfileFirstLine({ ownProfile, term, place }) {
  const rating = ownProfile.rating === null ? NA : ownProfile.rating.toFixed(1);
  const reviews =
    ownProfile.reviewCount === null ? NA : ownProfile.reviewCount.toLocaleString("en-US");
  const photos = ownProfile.photoCount === null ? NA : String(ownProfile.photoCount);
  const category = ownProfile.primaryCategory ?? NA;
  return (
    `Your profile exists (rating ${rating}, ${reviews} reviews, ${photos} photos, ` +
    `category ${category}) but does not rank for "${term}" from ${place}.`
  );
}

/** Does this result need a Details call - i.e. is any tracked field simply absent from the object? */
export function needsDetails(place) {
  if (!place) return false;
  const trackedKeys = [
    "rating",
    "userRatingCount",
    "photos",
    "primaryType",
    "regularOpeningHours",
    "websiteUri"
  ];
  return trackedKeys.some((key) => !(key in place));
}

function formatCount(count, capped) {
  if (count === null || count === undefined) return NA;
  return capped ? "10+" : String(count);
}

/** One markdown table row (array of 8 cells) for a rank label + extracted place data. */
export function formatRow(rankLabel, data) {
  if (!data) return [rankLabel, NA, NA, NA, NA, NA, NA, NA];
  return [
    rankLabel,
    data.name ?? NA,
    data.rating === null ? NA : data.rating.toFixed(1),
    data.reviewCount === null ? NA : data.reviewCount.toLocaleString("en-US"),
    formatCount(data.photoCount, data.photoCapped),
    data.primaryCategory ?? NA,
    data.hasHours ? "yes" : "no",
    data.hasWebsite ? "yes" : "no"
  ];
}

/**
 * One markdown table row for a competitor/client-shaped record (H05:
 * `hoursListed` + `website` as a host string, rather than extractPlaceData's
 * `hasHours`/`hasWebsite`/`websiteUri`). Delegates to `formatRow` so the
 * cell formatting itself (em dash, photo cap, rating/review formatting)
 * stays in exactly one place.
 */
export function formatCompetitorRow(rankLabel, data) {
  if (!data) return formatRow(rankLabel, null);
  return formatRow(rankLabel, {
    name: data.name,
    rating: data.rating,
    reviewCount: data.reviewCount,
    photoCount: data.photoCount,
    photoCapped: data.photoCapped,
    primaryCategory: data.primaryCategory,
    hasHours: Boolean(data.hoursListed),
    hasWebsite: Boolean(data.website)
  });
}

/**
 * "The term's service category family": the primaryCategory shared by at
 * least 2 of the given (non-null) categories, else the first one seen (a
 * majority of 1 is never claimed) - reusing the same category-agreement
 * rule the suggestions builder uses for "N of 5 competitors list X". Null
 * when nothing in the list carries a category at all.
 */
export function termServiceCategory(categories) {
  const cats = (categories ?? []).filter(Boolean);
  if (!cats.length) return null;
  return majorityValue(cats) ?? cats[0];
}

/**
 * Competitor/client attribute record from one raw Places API result:
 * name, rating, reviewCount, photoCount(+Capped), primaryCategory,
 * hoursListed, website (HOST, not the full URL), hasDescription (from
 * editorialSummary), servicesCount (always null - the Places API exposes no
 * such field), distanceMi (haversine from `center`, null if either point is
 * missing). Null when there is no place (never fabricated).
 */
export function extractCompetitorData(place, center) {
  if (!place) return null;
  const base = extractPlaceData(place);
  return {
    name: base.name,
    rating: base.rating,
    reviewCount: base.reviewCount,
    photoCount: base.photoCount,
    photoCapped: base.photoCapped,
    primaryCategory: base.primaryCategory,
    hoursListed: base.hasHours,
    website: hostFromUrl(base.websiteUri),
    hasDescription: Boolean(place.editorialSummary),
    servicesCount: null,
    distanceMi: haversineMiles(center, place.location)
  };
}

/**
 * The top `count` competitors for a term: OTHER businesses (excludeIndex,
 * the client's own index, is never a candidate) whose primaryCategory
 * matches `termServiceCategory` come first, in rank order; when fewer than
 * `count` match, the ranked list fills the remaining slots (categoryMatch:
 * false) - never leaves a slot empty when candidates remain. Each entry
 * keeps its original 1-based rank as `position`.
 */
export function selectCompetitors({ results, center, excludeIndex, count }) {
  const list = results ?? [];
  const extractedAll = list.map((p) => extractPlaceData(p));
  const candidateCategories = extractedAll
    .filter((_, i) => i !== excludeIndex)
    .map((d) => d && d.primaryCategory);
  const termCategory = termServiceCategory(candidateCategories);

  const matched = [];
  const unmatched = [];
  list.forEach((place, i) => {
    if (i === excludeIndex) return;
    const cat = extractedAll[i] && extractedAll[i].primaryCategory;
    const categoryMatch = termCategory !== null && cat === termCategory;
    (categoryMatch ? matched : unmatched).push({ place, position: i + 1, categoryMatch });
  });

  return [...matched, ...unmatched].slice(0, count).map((entry) => ({
    position: entry.position,
    categoryMatch: entry.categoryMatch,
    ...extractCompetitorData(entry.place, center)
  }));
}

/**
 * The single highest-ranked OTHER business for a term (excludeIndex never a
 * candidate), regardless of category match - used only for the report's
 * page-1 "top competitor <name>" call-out line, which means Google's most
 * relevant result, not necessarily one of the category-filtered
 * `competitors`. Null when there are no other results at all.
 */
export function topCompetitorFor({ results, excludeIndex, center }) {
  const list = results ?? [];
  for (let i = 0; i < list.length; i += 1) {
    if (i === excludeIndex) continue;
    return { position: i + 1, ...extractCompetitorData(list[i], center) };
  }
  return null;
}

/**
 * The unified client row: same attribute shape as a competitor, plus
 * `position` (1-60, or null) and `status` ("not showing" ONLY when there is
 * truly no data at all - no rank AND no own profile; null otherwise, even
 * when the business does not rank but its own profile was found).
 *   - Ranked (`place` given): attributes from that raw Places result.
 *   - Not ranked, own profile found: attributes from `ownProfile` (website
 *     converted to a host, matching the competitor shape).
 *   - Neither: every attribute null, status "not showing".
 */
export function buildClientRow({ place, rank, ownProfile, center }) {
  if (place) {
    return { position: rank, status: null, ...extractCompetitorData(place, center) };
  }
  if (ownProfile && ownProfile.found) {
    return {
      position: null,
      status: null,
      name: ownProfile.name,
      rating: ownProfile.rating,
      reviewCount: ownProfile.reviewCount,
      photoCount: ownProfile.photoCount,
      photoCapped: ownProfile.photoCount === 10,
      primaryCategory: ownProfile.primaryCategory,
      hoursListed: ownProfile.hoursListed,
      website: hostFromUrl(ownProfile.website),
      hasDescription: Boolean(ownProfile.hasDescription),
      servicesCount: null,
      distanceMi: ownProfile.distanceMi ?? null
    };
  }
  return {
    position: null,
    status: NOT_SHOWING,
    name: null,
    rating: null,
    reviewCount: null,
    photoCount: null,
    photoCapped: null,
    primaryCategory: null,
    hoursListed: null,
    website: null,
    hasDescription: null,
    servicesCount: null,
    distanceMi: null
  };
}

/**
 * Suggestions comparing the client against its competitor set, one sentence
 * per attribute where the client is below the competitors' median (numeric)
 * or lacks what most competitors have (category/hours/website/description) -
 * numbers always come from the actual competitor data, never invented. A
 * missing client value is treated as 0/absent (it is what the searcher
 * actually sees), so it triggers the same sentence as a low value - this is
 * only ever called for a client with SOME known data (ranked, or its own
 * profile was found); see `buildRecommendations`.
 */
export function buildCompetitorSuggestions({ client, competitors }) {
  const recs = [];
  const others = (competitors ?? []).filter(Boolean);
  const total = others.length;
  if (!total) return recs;

  const reviewVals = others.map((c) => c.reviewCount).filter((v) => v !== null && v !== undefined);
  if (reviewVals.length) {
    const clientReviews = numOrZero(client && client.reviewCount);
    if (clientReviews < median(reviewVals)) {
      const avg = Math.round(mean(reviewVals));
      recs.push(
        `Competitors average ${avg} reviews; you have ${clientReviews} — ask your last 10 clients for a Google review.`
      );
    }
  }

  const photoVals = others.map((c) => c.photoCount).filter((v) => v !== null && v !== undefined);
  if (photoVals.length) {
    const clientPhotos = numOrZero(client && client.photoCount);
    if (clientPhotos < median(photoVals)) {
      const avg = Math.round(mean(photoVals));
      recs.push(
        `Competitors average ${avg} photos; you have ${clientPhotos} — add more photos of your work.`
      );
    }
  }

  const { value: bestCategory, count: categoryCount } = bestValueCount(
    others.map((c) => c.primaryCategory).filter(Boolean)
  );
  const clientCategory = (client && client.primaryCategory) || null;
  if (bestCategory && categoryCount >= 2 && clientCategory !== bestCategory) {
    const yours = clientCategory ? `"${clientCategory}"` : "not set";
    recs.push(
      `${categoryCount} of ${total} competitors list "${bestCategory}" as primary category; yours is ${yours} — change it.`
    );
  }

  const hoursCount = others.filter((c) => c.hoursListed).length;
  if (!(client && client.hoursListed) && hoursCount >= 2) {
    recs.push(
      `${hoursCount} of ${total} competitors list business hours; yours are not published — add your hours.`
    );
  }

  const websiteCount = others.filter((c) => c.website).length;
  if (!(client && client.website) && websiteCount >= 2) {
    recs.push(
      `${websiteCount} of ${total} competitors link a website; yours does not — link your website to your profile.`
    );
  }

  const descriptionCount = others.filter((c) => c.hasDescription).length;
  if (!(client && client.hasDescription) && descriptionCount >= 2) {
    recs.push(
      `${descriptionCount} of ${total} competitors have a business description on their profile; yours does not — add one.`
    );
  }

  return recs;
}

/** The exact-position line when the business WAS found: "Your listing is #N of M results ...". */
export function foundPositionLine({ rankLabel, searched, term, place }) {
  return `Your listing is #${rankLabel} of ${searched} results for "${term}" from ${place}.`;
}

/** The exact-position line when the business was NOT found within the searched depth. */
export function notFoundPositionLine({ term, place }) {
  return `Your business does not appear in the top 60 results for "${term}" from ${place}.`;
}

/**
 * Recommendations for one term, built from the unified `client` row (see
 * `buildClientRow`) and its `competitors` set:
 *   - status "not showing" (no rank, no own profile): the exact-position
 *     line + the claim/verify line only - never a fabricated gap against
 *     competitors for a business with no discoverable profile at all.
 *   - not ranked, own profile found (`position === null`, status not "not
 *     showing"): the exact-position line + "Your profile exists ..." +
 *     competitor-comparison suggestions.
 *   - ranked: the exact-position line + competitor-comparison suggestions.
 */
export function buildRecommendations({ client, competitors, term, place, searched }) {
  if (client.status === NOT_SHOWING) {
    return [
      notFoundPositionLine({ term, place }),
      `No listing found for "${term}" from ${place} — claim/verify a Google Business Profile.`
    ];
  }
  if (client.position === null) {
    return [
      notFoundPositionLine({ term, place }),
      ownProfileFirstLine({ ownProfile: client, term, place }),
      ...buildCompetitorSuggestions({ client, competitors })
    ];
  }
  return [
    foundPositionLine({ rankLabel: String(client.position), searched, term, place }),
    ...buildCompetitorSuggestions({ client, competitors })
  ];
}

/** One term's table + suggestions section (no trailing guidance block - renderMarkdown appends that once). */
export function renderTermSection({ term, place, rows, recommendations }) {
  const tableRows = rows.map((r) => {
    const cells = r.isBusiness ? r.cells.map((c) => `**${c}**`) : r.cells;
    return `| ${cells.join(" | ")} |`;
  });
  const lines = [
    `## Competitor analysis — "${term}" from ${place}`,
    "",
    TABLE_HEADER,
    TABLE_SEP,
    ...tableRows
  ];
  if (recommendations.length) {
    lines.push("", "**Suggestions**", "");
    for (const rec of recommendations) lines.push(`- ${rec}`);
  }
  return lines.join("\n");
}

/** Full document: every term section, then the static Google guidance block once. */
export function renderMarkdown({ sections }) {
  return [...(sections ?? []), GOOGLE_GUIDANCE_BLOCK, ""].join("\n\n");
}

/**
 * Assemble one term's competitors + client row + suggestions from a
 * searchText-shaped `results` array (Google's own relevance order = the
 * local ranking). The client row is ALWAYS its own table row (bold),
 * labelled "NOT SHOWING" whenever it has no numeric position - even when an
 * own profile was found, so the printed table always makes absence obvious
 * at a glance - never duplicated among the `competitors` (the client's own
 * index is always excluded from competitor selection).
 */
export function buildTermOutput({ term, place, results, domain, name, top, ownProfile, center }) {
  const list = results ?? [];
  const searched = list.length;
  const idx = matchBusiness(list, domain, name);
  const rankLabel = idx === null ? NOT_IN_TOP_60 : String(idx + 1);

  const competitors = selectCompetitors({ results: list, center, excludeIndex: idx, count: top });
  const client = buildClientRow({
    place: idx === null ? null : list[idx],
    rank: idx === null ? null : idx + 1,
    ownProfile,
    center
  });
  const topCompetitor = topCompetitorFor({ results: list, excludeIndex: idx, center });

  const rows = competitors.map((c) => ({
    isBusiness: false,
    cells: formatCompetitorRow(String(c.position), c)
  }));
  const clientRankLabel = client.position !== null ? String(client.position) : NOT_SHOWING_LABEL;
  rows.push({
    isBusiness: true,
    cells: formatCompetitorRow(clientRankLabel, client.status === NOT_SHOWING ? null : client)
  });

  const recommendations = buildRecommendations({ client, competitors, term, place, searched });

  return {
    rank: idx === null ? null : idx + 1,
    rankLabel,
    searched,
    client,
    competitors,
    topCompetitor,
    section: renderTermSection({ term, place, rows, recommendations }),
    recommendations
  };
}

/** Google Ads-API-style error body -> one human message; never echoes request URLs/keys. */
export function describeApiError(status, json) {
  const error = json && json.error ? json.error : null;
  const message = error && error.message ? error.message : `HTTP ${status}`;
  const lines = [`Google API error (HTTP ${status}): ${message}`];
  if (error && error.status) lines.push(`status: ${error.status}`);
  return lines.join("\n");
}

// --------------------------------------------------------------------------
// CLI
// --------------------------------------------------------------------------

const USAGE = [
  "Competitor analysis for a local search term -> markdown for the complimentary report",
  "",
  "Usage:",
  '  node scripts/local-rank.mjs --domain <domain> --terms "<term>;<term>" \\',
  '    --place "<City, GA | zip>" --out <path.md> \\',
  "    [--json <path>] [--env <path>] [--name <business name>] \\",
  "    [--radius-km 15] [--top 5] [--depth 20|40|60] [--dry-run]",
  "",
  "Env keys (from --env, default .env.local in CWD; process env is a fallback):",
  ...REQUIRED_ENV_KEYS.map((k) => `  ${k} (required)`),
  ""
].join("\n");

export function parseArgs(argv) {
  const opts = {
    domain: null,
    name: null,
    terms: null,
    place: null,
    out: null,
    json: null,
    env: ".env.local",
    radiusKm: DEFAULT_RADIUS_KM,
    top: DEFAULT_TOP,
    depth: DEFAULT_DEPTH,
    dryRun: false
  };
  const flags = {
    "--domain": "domain",
    "--name": "name",
    "--terms": "terms",
    "--place": "place",
    "--out": "out",
    "--json": "json",
    "--env": "env",
    "--radius-km": "radiusKm",
    "--top": "top",
    "--depth": "depth"
  };
  const numericFlags = new Set(["--radius-km", "--top", "--depth"]);

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--dry-run") {
      opts.dryRun = true;
      continue;
    }
    if (arg === "--help" || arg === "-h") {
      opts.help = true;
      continue;
    }
    const key = flags[arg];
    if (!key) throw new Error(`Unknown argument: ${arg}`);
    const value = argv[i + 1];
    if (value === undefined || value.startsWith("--")) {
      throw new Error(`${arg} requires a value`);
    }
    opts[key] = numericFlags.has(arg) ? Number(value) : value;
    i += 1;
  }

  if (!opts.help) {
    if (!opts.domain) throw new Error("--domain <domain> is required");
    if (!opts.terms) throw new Error("--terms <term;term> is required");
    if (!opts.place) throw new Error("--place <City, GA | zip> is required");
    if (!opts.out) throw new Error("--out <path> is required");
    if (!opts.json) opts.json = `${opts.out}.json`;
    if (!Number.isFinite(opts.radiusKm) || opts.radiusKm <= 0) {
      throw new Error("--radius-km must be a positive number");
    }
    if (!Number.isInteger(opts.top) || opts.top <= 0) {
      throw new Error("--top must be a positive integer");
    }
    if (!VALID_DEPTHS.has(opts.depth)) {
      throw new Error("--depth must be one of 20, 40, 60");
    }
  }
  return opts;
}

function loadEnv(envPath) {
  let fileVars = {};
  let envFileFound = false;
  try {
    fileVars = parseEnvFile(readFileSync(envPath, "utf8"));
    envFileFound = true;
  } catch {
    fileVars = {};
  }

  const resolved = {};
  for (const key of REQUIRED_ENV_KEYS) {
    const value = fileVars[key] || process.env[key] || "";
    if (value) resolved[key] = value;
  }
  const missing = REQUIRED_ENV_KEYS.filter((key) => !resolved[key]);
  return { resolved, missing, envFileFound };
}

function printDryRun(opts, terms, envState) {
  const lines = [
    "Dry run — no network calls will be made.",
    "",
    `Domain:  ${opts.domain}${opts.name ? ` (name fallback: ${opts.name})` : ""}`,
    `Terms (${terms.length}): ${terms.join("; ")}`,
    `Place:   ${opts.place}`,
    `Radius:  ${opts.radiusKm} km`,
    `Competitors: ${opts.top}`,
    `Depth:   ${opts.depth} (${pagesForDepth(opts.depth)} page(s) of ${SEARCH_PAGE_SIZE})`,
    `Env file:   ${opts.env}${envState.envFileFound ? "" : " (not found; process env only)"}`,
    `Env keys present (values NEVER shown): ${REQUIRED_ENV_KEYS.join(", ")}`,
    `Output:     ${opts.out}`,
    `Raw JSON:   ${opts.json}`,
    "",
    "1) Geocode the area centre (key sent as a query param, never printed):",
    `   GET ${GEOCODE_HOST}?address=${encodeURIComponent(geocodeAddressParam(opts.place))}&key=<REDACTED>`,
    "",
    `2) For each term, Places API Text Search, up to ${pagesForDepth(opts.depth)} page(s)` +
      ` via nextPageToken (Google's own relevance order = the local ranking; a 2s delay + one` +
      " retry if a page token isn't valid yet):",
    `   POST ${PLACES_HOST}/places:searchText`,
    `   headers: X-Goog-Api-Key: <REDACTED>, X-Goog-FieldMask: ${SEARCH_FIELD_MASK}`
  ];
  for (const term of terms) {
    lines.push(
      `   body: ${JSON.stringify(searchTextBody(term, "<resolved from step 1>", opts.radiusKm))}`
    );
  }
  lines.push(
    "",
    `3) Place Details (GET ${PLACES_HOST}/places/{id}, field mask: ${DETAILS_FIELD_MASK}) -` +
      ` issued only for a top-${opts.top}/business result missing a tracked field from the search response.`,
    "",
    `4) ONE extra own-profile lookup per term whose searched depth (${opts.depth}) does NOT contain the business` +
      " (never when it already ranks):",
    `   POST ${PLACES_HOST}/places:searchText`,
    `   headers: X-Goog-Api-Key: <REDACTED>, X-Goog-FieldMask: ${SEARCH_FIELD_MASK}`,
    `   body: ${JSON.stringify(ownProfileSearchBody(resolveBusinessName(opts.name, opts.domain), opts.place))}`,
    ""
  );
  process.stdout.write(lines.join("\n"));
}

async function postJson(url, body, headers) {
  const response = await globalThis.fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body)
  });
  const text = await response.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    json = null;
  }
  return { ok: response.ok, status: response.status, json };
}

async function getJson(url, headers) {
  const response = await globalThis.fetch(url, { headers });
  const text = await response.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    json = null;
  }
  return { ok: response.ok, status: response.status, json };
}

async function geocode(place, apiKey) {
  const url = `${GEOCODE_HOST}?address=${encodeURIComponent(geocodeAddressParam(place))}&key=${apiKey}`;
  const res = await getJson(url);
  if (!res.ok || !res.json || res.json.status !== "OK" || !res.json.results?.length) {
    const status = res.json && res.json.status ? res.json.status : `HTTP ${res.status}`;
    fail(`Geocoding API error for "${place}": ${status}`, 2);
  }
  const loc = res.json.results[0].geometry.location;
  return { latitude: loc.lat, longitude: loc.lng };
}

// nextPageToken is a top-level response field (not under `places.`), so the
// paginated search request needs it added to the field mask; the base
// SEARCH_FIELD_MASK stays untouched (single-page callers, dry-run printing,
// and the "search mask == details mask with a places. prefix" invariant).
const SEARCH_FIELD_MASK_PAGED = `${SEARCH_FIELD_MASK},nextPageToken`;

async function searchTextPage(body, apiKey) {
  const res = await postJson(`${PLACES_HOST}/places:searchText`, body, {
    "X-Goog-Api-Key": apiKey,
    "X-Goog-FieldMask": SEARCH_FIELD_MASK_PAGED
  });
  if (!res.ok) fail(describeApiError(res.status, res.json), 2);
  return { places: (res.json && res.json.places) || [], nextPageToken: res.json && res.json.nextPageToken };
}

async function searchText(term, center, radiusKm, apiKey, depth) {
  return fetchSearchPages({
    term,
    center,
    radiusKm,
    depth,
    fetchPage: (body) => searchTextPage(body, apiKey)
  });
}

async function fetchDetails(placeId, apiKey) {
  const res = await getJson(`${PLACES_HOST}/places/${placeId}`, {
    "X-Goog-Api-Key": apiKey,
    "X-Goog-FieldMask": DETAILS_FIELD_MASK
  });
  if (!res.ok) fail(describeApiError(res.status, res.json), 2);
  return res.json;
}

/** Fill in a result's missing tracked fields with a Details call, only when needed. */
async function completeResult(place, apiKey) {
  if (!needsDetails(place) || !place.id) return place;
  const details = await fetchDetails(place.id, apiKey);
  return { ...details, ...place };
}

async function searchOwnProfileText(name, place, apiKey) {
  const res = await postJson(`${PLACES_HOST}/places:searchText`, ownProfileSearchBody(name, place), {
    "X-Goog-Api-Key": apiKey,
    "X-Goog-FieldMask": SEARCH_FIELD_MASK
  });
  if (!res.ok) fail(describeApiError(res.status, res.json), 2);
  return (res.json && res.json.places) || [];
}

/**
 * ONE extra Places Text Search to find the business's own profile directly,
 * used only for a term whose searched depth does not contain the business.
 * Never fabricates a match: null when the dedicated search finds nothing.
 */
async function lookupOwnProfile({ domain, name, place, apiKey, center }) {
  const resolvedName = resolveBusinessName(name, domain);
  process.stdout.write(
    `Own-profile lookup: "${resolvedName}" was not found - running one extra Places search for its own profile.\n`
  );
  const rawResults = await searchOwnProfileText(resolvedName, place, apiKey);
  const idx = matchOwnProfile(rawResults, domain, name || resolvedName);
  if (idx === null) return null;
  const complete = await completeResult(rawResults[idx], apiKey);
  return extractOwnProfile(complete, center);
}

// --------------------------------------------------------------------------
// main
// --------------------------------------------------------------------------

async function main() {
  let opts;
  try {
    opts = parseArgs(process.argv.slice(2));
  } catch (err) {
    process.stderr.write(`${err.message}\n\n${USAGE}`);
    process.exit(1);
    return;
  }
  if (opts.help) {
    process.stdout.write(USAGE);
    process.exit(0);
    return;
  }

  let terms;
  try {
    terms = parseTermList(opts.terms);
  } catch (err) {
    fail(`Could not parse --terms: ${err.message}`, 1);
    return;
  }

  const envState = loadEnv(opts.env);
  if (envState.missing.length > 0) {
    fail(
      [
        `Missing required env key${envState.missing.length === 1 ? "" : "s"}: ${envState.missing.join(", ")}`,
        `Looked in ${opts.env}${envState.envFileFound ? "" : " (file not found)"} and the process environment.`,
        "Values are never read back or printed by this script — key names only."
      ].join("\n"),
      1
    );
    return;
  }

  if (opts.dryRun) {
    printDryRun(opts, terms, envState);
    process.exit(0);
    return;
  }

  const apiKey = envState.resolved.GOOGLE_MAPS_API_KEY;
  const center = await geocode(opts.place, apiKey);

  const sections = [];
  const jsonTerms = [];
  for (const term of terms) {
    const rawResults = await searchText(term, center, opts.radiusKm, apiKey, opts.depth);
    const idx = matchBusiness(rawResults, opts.domain, opts.name);
    const completeIndexes = new Set(rawResults.slice(0, opts.top).map((_, i) => i));
    if (idx !== null) completeIndexes.add(idx);
    const results = await Promise.all(
      rawResults.map((r, i) => (completeIndexes.has(i) ? completeResult(r, apiKey) : r))
    );

    // One extra API call per unranked term only - never when the business already ranks.
    const ownProfile =
      idx === null
        ? await lookupOwnProfile({ domain: opts.domain, name: opts.name, place: opts.place, apiKey, center })
        : null;

    const { rank, searched, section, recommendations, client, competitors, topCompetitor } = buildTermOutput({
      term,
      place: opts.place,
      results,
      domain: opts.domain,
      name: opts.name,
      top: opts.top,
      ownProfile,
      center
    });
    sections.push(section);
    jsonTerms.push({ term, rank, searched, client, competitors, topCompetitor, recommendations, ownProfile, results });
  }

  const markdown = renderMarkdown({ sections });
  writeFileSync(opts.out, markdown, "utf8");

  if (opts.json) {
    writeFileSync(
      opts.json,
      `${JSON.stringify(
        {
          domain: opts.domain,
          name: opts.name,
          place: opts.place,
          center,
          radiusKm: opts.radiusKm,
          top: opts.top,
          depth: opts.depth,
          terms: jsonTerms
        },
        null,
        2
      )}\n`,
      "utf8"
    );
  }

  process.stdout.write(
    `Wrote ${opts.out}${opts.json ? ` and ${opts.json}` : ""} (${terms.length} term(s)).\n`
  );
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main().catch((err) => {
    process.stderr.write(`Fatal: ${err.message}\n`);
    process.exit(2);
  });
}
