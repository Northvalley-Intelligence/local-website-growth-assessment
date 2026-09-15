#!/usr/bin/env node
// scripts/local-rank.mjs
// ---------------------------------------------------------------------------
// Where a business sits in Google's local listing for its own search terms,
// plus what the top 3 businesses in the area do better -> a markdown section
// for the complimentary website report.
//
// Data source: Google Maps Platform.
//   - Geocoding API resolves the area centre (city/zip -> lat/lng).
//   - Places API (New) Text Search (POST .../v1/places:searchText) returns
//     results in Google's own relevance order for that query from that
//     point - that order IS the local ranking. No scraping of Google Maps
//     or Search (ToS).
//
// When a term's top 20 does not contain the business, ONE extra Text Search
// (textQuery: "<name> <place>") looks up the business's OWN Google profile
// directly, so an unranked business that nonetheless has a verified profile
// is never told to "claim/verify" a profile it already has. Each term's JSON
// carries `ownProfile` (null when no own profile was found or none looked
// up because the business already ranked): { found, name, rating,
// reviewCount, photoCount, primaryCategory, hoursListed, website, placeId }.
// When found, the recommendations become concrete gaps vs the top 3 instead
// of a claim/verify instruction.
//
// Node built-ins only. No npm deps. Secrets are read from an env file
// (default .env.local in CWD), held in memory only, and NEVER printed or
// logged - not even in --dry-run output or error messages.
//
// Usage:
//   node scripts/local-rank.mjs --domain <domain> --terms "<term>;<term>" \
//     --place "<City, GA | zip>" --out <path.md> \
//     [--json <path>] [--env <path>] [--name <business name>] \
//     [--radius-km 15] [--top 3] [--dry-run]
//
// Exit codes: 0 ok · 1 bad input / missing env · 2 Google API failure.
// ---------------------------------------------------------------------------

import { readFileSync, writeFileSync } from "node:fs";
import process from "node:process";
import { pathToFileURL } from "node:url";

export const NA = "—"; // em dash - the ONLY placeholder for a null/absent value
export const NOT_IN_TOP_20 = "not in top 20";

const GEOCODE_HOST = "https://maps.googleapis.com/maps/api/geocode/json";
const PLACES_HOST = "https://places.googleapis.com/v1";
const DEFAULT_RADIUS_KM = 15;
const DEFAULT_TOP = 3;
const SEARCH_PAGE_SIZE = 20;
const OWN_PROFILE_PAGE_SIZE = 5;

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
// mask so the two are easy to diff by eye.
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
  "editorialSummary"
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

/** The category shared by at least 2 of the given values, else null (never guesses a majority of 1). */
function majorityValue(values) {
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
  return bestCount >= 2 ? best : null;
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
 */
export function extractOwnProfile(place) {
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
    placeId: data.placeId
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
 * Recommendations comparing a business's extracted data against the top-N
 * businesses' extracted data. Each rule fires ONLY when its evidence says so;
 * numbers in the sentence come from the actual data, never invented. Shared
 * by the in-top-20 case and the not-in-top-20-but-own-profile-found case.
 */
export function buildGapRecommendations({ business, top3 }) {
  const recs = [];
  const others = top3 ?? [];

  const reviews3 = others.map((t) => t.reviewCount).filter((v) => v !== null);
  if (reviews3.length && business.reviewCount !== null) {
    const med = median(reviews3);
    if (business.reviewCount < med) {
      const avg = Math.round(mean(reviews3));
      recs.push(
        `Get more Google reviews — the top 3 average ${avg}; you have ${business.reviewCount}.`
      );
    }
  }

  const ratings3 = others.map((t) => t.rating).filter((v) => v !== null);
  if (ratings3.length && business.rating !== null) {
    const min3 = Math.min(...ratings3);
    if (business.rating < 4.5 && business.rating < min3) {
      recs.push(
        `Respond to reviews; rating ${business.rating.toFixed(1)} vs top-3 ${min3.toFixed(1)}.`
      );
    }
  }

  const photos3 = others.map((t) => t.photoCount).filter((v) => v !== null);
  if (photos3.length && business.photoCount !== null) {
    const med = median(photos3);
    if (business.photoCount < med) {
      recs.push(
        `Add more pictures — top 3 carry ${Math.round(med)}; you have ${formatCount(business.photoCount, business.photoCapped)}.`
      );
    }
  }

  const cats3 = others.map((t) => t.primaryCategory).filter(Boolean);
  if (cats3.length) {
    const majority = majorityValue(cats3);
    if (majority && business.primaryCategory !== majority) {
      recs.push(`Set primary category to ${majority} (top 3 use it).`);
    }
  }

  const hoursCount3 = others.filter((t) => t.hasHours).length;
  if (!business.hasHours && hoursCount3 >= 2) {
    recs.push("Publish business hours.");
  }

  if (!business.hasWebsite) {
    recs.push("Link the website to the profile.");
  }

  return recs;
}

/**
 * Recommendations for one term: gaps vs the top 3 when the business ranks
 * (or its own profile was found even though it does not rank - honest gaps,
 * never a fabricated "claim/verify" when a profile already exists); the
 * claim/verify line only when there is truly no profile.
 */
export function buildRecommendations({
  business,
  businessRankLabel,
  top3,
  term,
  place,
  ownProfile
}) {
  if (businessRankLabel === NOT_IN_TOP_20 || !business) {
    if (ownProfile && ownProfile.found) {
      const adapted = {
        rating: ownProfile.rating,
        reviewCount: ownProfile.reviewCount,
        photoCount: ownProfile.photoCount,
        photoCapped: ownProfile.photoCount === 10,
        primaryCategory: ownProfile.primaryCategory,
        hasHours: Boolean(ownProfile.hoursListed),
        hasWebsite: Boolean(ownProfile.website)
      };
      return [
        ownProfileFirstLine({ ownProfile, term, place }),
        ...buildGapRecommendations({ business: adapted, top3 })
      ];
    }
    return [
      `No listing found for "${term}" from ${place} — claim/verify a Google Business Profile.`
    ];
  }

  return buildGapRecommendations({ business, top3 });
}

/** One term's table + recommendations section (no trailing guidance block - renderMarkdown appends that once). */
export function renderTermSection({ term, place, rows, recommendations }) {
  const tableRows = rows.map((r) => {
    const cells = r.isBusiness ? r.cells.map((c) => `**${c}**`) : r.cells;
    return `| ${cells.join(" | ")} |`;
  });
  const lines = [
    `## Where you are in the business listing — "${term}" from ${place}`,
    "",
    TABLE_HEADER,
    TABLE_SEP,
    ...tableRows
  ];
  if (recommendations.length) {
    lines.push("", "**Recommendations**", "");
    for (const rec of recommendations) lines.push(`- ${rec}`);
  }
  return lines.join("\n");
}

/** Full document: every term section, then the static Google guidance block once. */
export function renderMarkdown({ sections }) {
  return [...(sections ?? []), GOOGLE_GUIDANCE_BLOCK, ""].join("\n\n");
}

/**
 * Assemble one term's rows + recommendations from a searchText-shaped
 * `results` array (Google's own relevance order = the local ranking).
 */
export function buildTermOutput({ term, place, results, domain, name, top, ownProfile }) {
  const list = results ?? [];
  const idx = matchBusiness(list, domain, name);
  const rankLabel = idx === null ? NOT_IN_TOP_20 : String(idx + 1);
  const topResults = list.slice(0, top);
  const topData = topResults.map(extractPlaceData);
  const businessData = idx === null ? null : extractPlaceData(list[idx]);

  const rows = topResults.map((r, i) => ({
    isBusiness: idx === i,
    cells: formatRow(String(i + 1), topData[i])
  }));
  if (idx !== null && idx >= top) {
    rows.push({ isBusiness: true, cells: formatRow(rankLabel, businessData) });
  }

  const recommendations = buildRecommendations({
    business: businessData,
    businessRankLabel: rankLabel,
    top3: topData,
    term,
    place,
    ownProfile
  });

  return {
    rankLabel,
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
  "Where a business ranks in Google's local listing -> markdown for the complimentary report",
  "",
  "Usage:",
  '  node scripts/local-rank.mjs --domain <domain> --terms "<term>;<term>" \\',
  '    --place "<City, GA | zip>" --out <path.md> \\',
  "    [--json <path>] [--env <path>] [--name <business name>] \\",
  "    [--radius-km 15] [--top 3] [--dry-run]",
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
    "--top": "top"
  };
  const numericFlags = new Set(["--radius-km", "--top"]);

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
    `Top N:   ${opts.top}`,
    `Env file:   ${opts.env}${envState.envFileFound ? "" : " (not found; process env only)"}`,
    `Env keys present (values NEVER shown): ${REQUIRED_ENV_KEYS.join(", ")}`,
    `Output:     ${opts.out}`,
    `Raw JSON:   ${opts.json}`,
    "",
    "1) Geocode the area centre (key sent as a query param, never printed):",
    `   GET ${GEOCODE_HOST}?address=${encodeURIComponent(geocodeAddressParam(opts.place))}&key=<REDACTED>`,
    "",
    "2) For each term, Places API Text Search (Google's own relevance order = the local ranking):",
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
    "4) ONE extra own-profile lookup per term whose top 20 does NOT contain the business" +
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

async function searchText(term, center, radiusKm, apiKey) {
  const res = await postJson(
    `${PLACES_HOST}/places:searchText`,
    searchTextBody(term, center, radiusKm),
    {
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": SEARCH_FIELD_MASK
    }
  );
  if (!res.ok) fail(describeApiError(res.status, res.json), 2);
  return (res.json && res.json.places) || [];
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
 * used only for a term whose top 20 does not contain the business. Never
 * fabricates a match: null when the dedicated search finds nothing.
 */
async function lookupOwnProfile({ domain, name, place, apiKey }) {
  const resolvedName = resolveBusinessName(name, domain);
  process.stdout.write(
    `Own-profile lookup: "${resolvedName}" is not in the top 20 - running one extra Places search for its own profile.\n`
  );
  const rawResults = await searchOwnProfileText(resolvedName, place, apiKey);
  const idx = matchOwnProfile(rawResults, domain, name || resolvedName);
  if (idx === null) return null;
  const complete = await completeResult(rawResults[idx], apiKey);
  return extractOwnProfile(complete);
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
    const rawResults = await searchText(term, center, opts.radiusKm, apiKey);
    const idx = matchBusiness(rawResults, opts.domain, opts.name);
    const completeIndexes = new Set(rawResults.slice(0, opts.top).map((_, i) => i));
    if (idx !== null) completeIndexes.add(idx);
    const results = await Promise.all(
      rawResults.map((r, i) => (completeIndexes.has(i) ? completeResult(r, apiKey) : r))
    );

    // One extra API call per unranked term only - never when the business already ranks.
    const ownProfile =
      idx === null
        ? await lookupOwnProfile({ domain: opts.domain, name: opts.name, place: opts.place, apiKey })
        : null;

    const { section, recommendations } = buildTermOutput({
      term,
      place: opts.place,
      results,
      domain: opts.domain,
      name: opts.name,
      top: opts.top,
      ownProfile
    });
    sections.push(section);
    jsonTerms.push({ term, results, recommendations, ownProfile });
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
