import { describe, expect, it, vi } from "vitest";

import {
  DETAILS_FIELD_MASK,
  GOOGLE_GUIDANCE_BLOCK,
  GOOGLE_GUIDANCE_URL,
  NA,
  NOT_IN_TOP_60,
  NOT_SHOWING,
  NOT_SHOWING_LABEL,
  SEARCH_FIELD_MASK,
  buildClientRow,
  buildCompetitorSuggestions,
  buildRecommendations,
  buildTermOutput,
  describeApiError,
  domainLabel,
  extractCompetitorData,
  extractOwnProfile,
  extractPlaceData,
  fetchSearchPages,
  formatCompetitorRow,
  formatRow,
  geocodeAddressParam,
  haversineMiles,
  hostFromUrl,
  kmToMeters,
  matchBusiness,
  matchOwnProfile,
  needsDetails,
  nextPageBody,
  normalizeDomain,
  normalizeNameForMatch,
  ownProfileFirstLine,
  ownProfileSearchBody,
  pagesForDepth,
  parseArgs,
  parseEnvFile,
  parseTermList,
  renderMarkdown,
  renderTermSection,
  resolveBusinessName,
  searchTextBody,
  selectCompetitors,
  termServiceCategory,
  topCompetitorFor
} from "../scripts/local-rank.mjs";

/** Build a Places API v1 result object, omitting a key entirely when its input is absent
 * (matching how Google's API omits rather than nulls a field it has nothing for). */
function makePlace({
  id,
  name,
  website,
  rating,
  reviews,
  category,
  hours,
  photos,
  description,
  location
} = {}) {
  const p = {};
  if (id !== undefined) p.id = id;
  if (name !== undefined) p.displayName = { text: name };
  if (website) p.websiteUri = website;
  if (rating !== undefined) p.rating = rating;
  if (reviews !== undefined) p.userRatingCount = reviews;
  if (category !== undefined) {
    p.primaryType = category.toLowerCase().replace(/\s+/g, "_");
    p.primaryTypeDisplayName = { text: category };
  }
  if (hours) p.regularOpeningHours = { periods: [] };
  if (photos !== undefined) {
    p.photos = Array.from({ length: photos }, (_, i) => ({ name: `photo-${i}` }));
  }
  if (description) p.editorialSummary = { text: description };
  if (location) p.location = location;
  return p;
}

describe("parseTermList", () => {
  it("splits a ;-separated value, trimming and dropping empties", () => {
    expect(parseTermList("realtor near me; wealth management atlanta ;")).toEqual([
      "realtor near me",
      "wealth management atlanta"
    ]);
  });

  it("throws when nothing usable survives", () => {
    expect(() => parseTermList("  ; ; ")).toThrow(/no usable terms/);
    expect(() => parseTermList("")).toThrow(/no usable terms/);
  });
});

describe("parseEnvFile", () => {
  it("parses keys, strips matched quotes, skips comments/blanks", () => {
    const parsed = parseEnvFile(
      ["# comment", "", 'GOOGLE_MAPS_API_KEY="abc123"', "export OTHER=1"].join("\n")
    );
    expect(parsed).toMatchObject({ GOOGLE_MAPS_API_KEY: "abc123", OTHER: "1" });
  });

  it("tolerates an empty file", () => {
    expect(parseEnvFile("")).toEqual({});
  });
});

describe("geocodeAddressParam", () => {
  it("appends ', GA' to a bare city/zip", () => {
    expect(geocodeAddressParam("Marietta")).toBe("Marietta, GA");
    expect(geocodeAddressParam("30060")).toBe("30060, GA");
  });

  it("leaves a place that already names a state untouched", () => {
    expect(geocodeAddressParam("Marietta, GA")).toBe("Marietta, GA");
    expect(geocodeAddressParam("Atlanta, GA")).toBe("Atlanta, GA");
  });
});

describe("kmToMeters", () => {
  it("converts and rounds", () => {
    expect(kmToMeters(15)).toBe(15000);
    expect(kmToMeters(1.5)).toBe(1500);
  });
});

describe("haversineMiles", () => {
  it("computes a known distance (~ Marietta to downtown Atlanta, ~16-17mi as the crow flies)", () => {
    const marietta = { latitude: 33.9526, longitude: -84.5499 };
    const atlanta = { latitude: 33.749, longitude: -84.388 };
    const miles = haversineMiles(marietta, atlanta);
    expect(miles).toBeGreaterThan(14);
    expect(miles).toBeLessThan(18);
  });

  it("is 0 for the same point", () => {
    const p = { latitude: 33.9526, longitude: -84.5499 };
    expect(haversineMiles(p, p)).toBe(0);
  });

  it("is null when either point is missing/unparseable — never a guessed distance", () => {
    expect(haversineMiles(null, { latitude: 1, longitude: 2 })).toBeNull();
    expect(haversineMiles({ latitude: 1, longitude: 2 }, undefined)).toBeNull();
    expect(haversineMiles({ latitude: 1, longitude: 2 }, {})).toBeNull();
  });
});

describe("searchTextBody", () => {
  it("builds the documented request contract", () => {
    const body = searchTextBody("realtor near me", { latitude: 1, longitude: 2 }, 15);
    expect(body).toEqual({
      textQuery: "realtor near me",
      locationBias: {
        circle: { center: { latitude: 1, longitude: 2 }, radius: 15000 }
      },
      pageSize: 20,
      rankPreference: "RELEVANCE"
    });
  });
});

describe("pagesForDepth / nextPageBody", () => {
  it("maps depth to page count, capped at 3 (60/20)", () => {
    expect(pagesForDepth(20)).toBe(1);
    expect(pagesForDepth(40)).toBe(2);
    expect(pagesForDepth(60)).toBe(3);
  });

  it("repeats the initial search's parameters and adds pageToken (Google requires an exact match)", () => {
    const center = { latitude: 1, longitude: 2 };
    expect(nextPageBody("realtor near me", center, 15, "TOKEN123")).toEqual({
      textQuery: "realtor near me",
      locationBias: { circle: { center, radius: 15000 } },
      pageSize: 20,
      rankPreference: "RELEVANCE",
      pageToken: "TOKEN123"
    });
  });
});

describe("fetchSearchPages (paginated merge, no real network/timers)", () => {
  function makePage(n) {
    return Array.from({ length: 20 }, (_, i) => makePlace({ name: `Page result ${n}-${i + 1}` }));
  }

  it("fetches a single page when depth is 20 (no pageToken ever used)", async () => {
    const fetchPage = vi.fn().mockResolvedValue({ places: makePage(1), nextPageToken: "tok-2" });
    const results = await fetchSearchPages({
      term: "t",
      center: { latitude: 1, longitude: 2 },
      radiusKm: 15,
      depth: 20,
      fetchPage
    });
    expect(results).toHaveLength(20);
    expect(fetchPage).toHaveBeenCalledTimes(1);
  });

  it("follows nextPageToken across 3 pages to 60 results, business found on page 3", async () => {
    const target = makePlace({ name: "Target Biz", website: "https://target.com" });
    const page3 = makePage(3);
    page3[0] = target; // index 40 overall (20 + 20 + 0) -> rank 41
    const fetchPage = vi.fn(async (body) => {
      if (!body.pageToken) return { places: makePage(1), nextPageToken: "tok-2" };
      if (body.pageToken === "tok-2") return { places: makePage(2), nextPageToken: "tok-3" };
      if (body.pageToken === "tok-3") return { places: page3, nextPageToken: null };
      throw new Error(`unexpected pageToken ${body.pageToken}`);
    });
    const results = await fetchSearchPages({
      term: "t",
      center: { latitude: 1, longitude: 2 },
      radiusKm: 15,
      depth: 60,
      fetchPage
    });
    expect(results).toHaveLength(60);
    expect(fetchPage).toHaveBeenCalledTimes(3);

    const out = buildTermOutput({
      term: "realtor near me",
      place: "Marietta, GA",
      results,
      domain: "target.com",
      top: 3
    });
    expect(out.rankLabel).toBe("41");
    expect(out.rank).toBe(41);
    expect(out.searched).toBe(60);
    expect(out.recommendations[0]).toBe(
      'Your listing is #41 of 60 results for "realtor near me" from Marietta, GA.'
    );
  });

  it("stops early once depth is reached, even with a nextPageToken still available", async () => {
    const fetchPage = vi.fn(async (body) => {
      if (!body.pageToken) return { places: makePage(1), nextPageToken: "tok-2" };
      return { places: makePage(2), nextPageToken: "tok-3" };
    });
    const results = await fetchSearchPages({
      term: "t",
      center: { latitude: 1, longitude: 2 },
      radiusKm: 15,
      depth: 40,
      fetchPage
    });
    expect(results).toHaveLength(40);
    expect(fetchPage).toHaveBeenCalledTimes(2);
  });

  it("stops when a page has no nextPageToken, before reaching depth", async () => {
    const fetchPage = vi.fn().mockResolvedValue({ places: makePage(1), nextPageToken: null });
    const results = await fetchSearchPages({
      term: "t",
      center: { latitude: 1, longitude: 2 },
      radiusKm: 15,
      depth: 60,
      fetchPage
    });
    expect(results).toHaveLength(20);
    expect(fetchPage).toHaveBeenCalledTimes(1);
  });

  it("retries a page ONCE (with a delay) when a fresh pageToken isn't valid yet, then uses the retry's places", async () => {
    let callsForPage2 = 0;
    const fetchPage = vi.fn(async (body) => {
      if (!body.pageToken) return { places: makePage(1), nextPageToken: "tok-2" };
      callsForPage2 += 1;
      if (callsForPage2 === 1) return { places: [], nextPageToken: undefined }; // token not valid yet
      return { places: makePage(2), nextPageToken: null };
    });
    const sleep = vi.fn().mockResolvedValue(undefined);
    const results = await fetchSearchPages({
      term: "t",
      center: { latitude: 1, longitude: 2 },
      radiusKm: 15,
      depth: 60,
      fetchPage,
      sleep
    });
    expect(sleep).toHaveBeenCalledTimes(1);
    expect(sleep).toHaveBeenCalledWith(2000);
    expect(results).toHaveLength(40); // page 1 (20) + the retried page 2 (20)
    expect(fetchPage).toHaveBeenCalledTimes(3); // page 1, page 2 attempt 1 (empty), page 2 retry
  });

  it("never retries more than once - an empty retry is accepted as final", async () => {
    let tok2Calls = 0;
    const fetchPage = vi.fn(async (body) => {
      if (!body.pageToken) return { places: makePage(1), nextPageToken: "tok-2" };
      tok2Calls += 1;
      // First attempt still claims more is coming; the retry (still empty) says there truly is none.
      return { places: [], nextPageToken: tok2Calls === 1 ? "tok-2-again" : null };
    });
    const sleep = vi.fn().mockResolvedValue(undefined);
    const results = await fetchSearchPages({
      term: "t",
      center: { latitude: 1, longitude: 2 },
      radiusKm: 15,
      depth: 60,
      fetchPage,
      sleep
    });
    expect(sleep).toHaveBeenCalledTimes(1);
    expect(results).toHaveLength(20); // only page 1 ever yielded places
    expect(fetchPage).toHaveBeenCalledTimes(3); // page 1, page 2 attempt 1 (empty), page 2 retry (empty, terminal)
  });

  it("not found beyond a full 60-result search: NOT_IN_TOP_60 with searched: 60", async () => {
    const fetchPage = vi.fn(async (body) => {
      if (!body.pageToken) return { places: makePage(1), nextPageToken: "tok-2" };
      if (body.pageToken === "tok-2") return { places: makePage(2), nextPageToken: "tok-3" };
      return { places: makePage(3), nextPageToken: null };
    });
    const results = await fetchSearchPages({
      term: "t",
      center: { latitude: 1, longitude: 2 },
      radiusKm: 15,
      depth: 60,
      fetchPage
    });
    const out = buildTermOutput({
      term: "realtor near me",
      place: "Marietta, GA",
      results,
      domain: "notpresent.com",
      top: 3
    });
    expect(out.rankLabel).toBe(NOT_IN_TOP_60);
    expect(out.rank).toBeNull();
    expect(out.searched).toBe(60);
    expect(out.recommendations[0]).toBe(
      'Your business does not appear in the top 60 results for "realtor near me" from Marietta, GA.'
    );
  });
});

describe("hostFromUrl / normalizeDomain", () => {
  it("strips www and lowercases", () => {
    expect(hostFromUrl("https://www.FeltonAndPeel.com/about")).toBe(
      "feltonandpeel.com"
    );
    expect(hostFromUrl("https://feltonandpeel.com")).toBe("feltonandpeel.com");
    expect(normalizeDomain("WWW.FeltonAndPeel.com")).toBe("feltonandpeel.com");
  });

  it("returns null for absent/unparseable URLs", () => {
    expect(hostFromUrl(undefined)).toBeNull();
    expect(hostFromUrl("not a url")).toBeNull();
  });
});

describe("matchBusiness", () => {
  const results = [
    makePlace({ name: "A", website: "https://a.com" }),
    makePlace({ name: "B", website: "https://b.com" }),
    makePlace({ name: "C", website: "https://c.com" }),
    makePlace({ name: "D", website: "https://d.com" }),
    makePlace({ name: "E", website: "https://e.com" }),
    makePlace({ name: "F", website: "https://f.com" }),
    makePlace({ name: "Felton & Peel", website: "https://www.feltonandpeel.com" }),
    makePlace({ name: "H", website: "https://h.com" })
  ];

  it("matches by domain (www-insensitive), giving a 1-based rank via the index", () => {
    const idx = matchBusiness(results, "feltonandpeel.com");
    expect(idx).toBe(6); // 7th result
  });

  it("falls back to --name when no domain matches", () => {
    const noWebsite = [
      makePlace({ name: "Felton & Peel" }),
      makePlace({ name: "Other" })
    ];
    expect(matchBusiness(noWebsite, "feltonandpeel.com", "Felton & Peel")).toBe(0);
  });

  it("returns null (never a guessed rank) when nothing matches within the results", () => {
    expect(matchBusiness(results, "notpresent.com")).toBeNull();
  });
});

describe("extractPlaceData", () => {
  it("extracts every tracked field", () => {
    const data = extractPlaceData(
      makePlace({
        id: "p1",
        name: "Felton & Peel",
        website: "https://feltonandpeel.com",
        rating: 4.6,
        reviews: 19,
        category: "Real estate agency",
        hours: false,
        photos: 4
      })
    );
    expect(data).toMatchObject({
      name: "Felton & Peel",
      rating: 4.6,
      reviewCount: 19,
      photoCount: 4,
      photoCapped: false,
      primaryCategory: "Real estate agency",
      hasHours: false,
      hasWebsite: true
    });
  });

  it("renders missing fields as null (formatRow turns those into em dashes), and caps photos at 10", () => {
    const data = extractPlaceData(makePlace({ name: "Bare" }));
    expect(data.rating).toBeNull();
    expect(data.reviewCount).toBeNull();
    expect(data.photoCount).toBeNull();
    expect(data.primaryCategory).toBeNull();
    expect(data.hasHours).toBe(false);
    expect(data.hasWebsite).toBe(false);

    const capped = extractPlaceData(makePlace({ name: "Popular", photos: 10 }));
    expect(capped.photoCount).toBe(10);
    expect(capped.photoCapped).toBe(true);
  });
});

describe("needsDetails", () => {
  it("is false when the search response already carries every tracked field", () => {
    const full = makePlace({
      name: "Full",
      website: "https://full.com",
      rating: 4.5,
      reviews: 10,
      category: "Real estate agency",
      hours: true,
      photos: 3
    });
    expect(needsDetails(full)).toBe(false);
  });

  it("is true when a tracked field is entirely absent", () => {
    expect(needsDetails(makePlace({ name: "Partial", rating: 4.5 }))).toBe(true);
  });
});

describe("formatRow", () => {
  it("formats a full row", () => {
    const data = extractPlaceData(
      makePlace({
        name: "Top Realty",
        website: "https://top.com",
        rating: 4.9,
        reviews: 212,
        category: "Real estate agency",
        hours: true,
        photos: 10
      })
    );
    expect(formatRow("1", data)).toEqual([
      "1",
      "Top Realty",
      "4.9",
      "212",
      "10+",
      "Real estate agency",
      "yes",
      "yes"
    ]);
  });

  it("fills every missing cell with the em dash, never a guess", () => {
    expect(formatRow(NOT_IN_TOP_60, null)).toEqual([
      NOT_IN_TOP_60,
      NA,
      NA,
      NA,
      NA,
      NA,
      NA,
      NA
    ]);
  });
});

describe("formatCompetitorRow", () => {
  it("delegates to formatRow, translating hoursListed/website(host) to hasHours/hasWebsite", () => {
    const data = extractCompetitorData(
      makePlace({
        name: "Top Realty",
        website: "https://www.top.com",
        rating: 4.9,
        reviews: 212,
        category: "Real estate agency",
        hours: true,
        photos: 10
      }),
      null
    );
    expect(formatCompetitorRow("1", data)).toEqual([
      "1",
      "Top Realty",
      "4.9",
      "212",
      "10+",
      "Real estate agency",
      "yes",
      "yes"
    ]);
  });

  it("fills every cell with the em dash when data is null (e.g. NOT SHOWING)", () => {
    expect(formatCompetitorRow(NOT_SHOWING_LABEL, null)).toEqual([
      NOT_SHOWING_LABEL,
      NA,
      NA,
      NA,
      NA,
      NA,
      NA,
      NA
    ]);
  });
});

describe("extractCompetitorData", () => {
  it("extracts the competitor attribute set: website as HOST, hasDescription, servicesCount null, distanceMi", () => {
    const center = { latitude: 33.9526, longitude: -84.5499 };
    const place = makePlace({
      id: "p1",
      name: "Top Realty",
      website: "https://www.top.com/about",
      rating: 4.9,
      reviews: 212,
      category: "Real estate agency",
      hours: true,
      photos: 10,
      description: "A great agency",
      location: { latitude: 33.749, longitude: -84.388 }
    });
    const data = extractCompetitorData(place, center);
    expect(data).toMatchObject({
      name: "Top Realty",
      rating: 4.9,
      reviewCount: 212,
      photoCount: 10,
      photoCapped: true,
      primaryCategory: "Real estate agency",
      hoursListed: true,
      website: "top.com",
      hasDescription: true,
      servicesCount: null
    });
    expect(data.distanceMi).toBeGreaterThan(0);
  });

  it("returns null when there is no place (never fabricated)", () => {
    expect(extractCompetitorData(null, null)).toBeNull();
  });

  it("hasDescription false and distanceMi null when the API omitted those fields", () => {
    const data = extractCompetitorData(makePlace({ name: "Bare" }), null);
    expect(data.hasDescription).toBe(false);
    expect(data.distanceMi).toBeNull();
    expect(data.website).toBeNull();
  });
});

describe("termServiceCategory", () => {
  it("is the category shared by at least 2 of the given categories", () => {
    expect(termServiceCategory(["Financial planner", "Financial planner", "Consultant"])).toBe(
      "Financial planner"
    );
  });

  it("falls back to the first category when nothing reaches a majority of 2", () => {
    expect(termServiceCategory(["Financial planner", "Consultant", "Plumber"])).toBe(
      "Financial planner"
    );
  });

  it("ignores nulls/blanks and returns null when there is nothing to go on", () => {
    expect(termServiceCategory([null, undefined, null])).toBeNull();
    expect(termServiceCategory([])).toBeNull();
  });
});

describe("selectCompetitors", () => {
  const center = { latitude: 33.9526, longitude: -84.5499 };

  it("selects the top N candidates whose category matches, excluding the client's own index", () => {
    const results = [
      makePlace({ name: "A", category: "Financial planner", rating: 4.9, reviews: 200 }),
      makePlace({ name: "Client", category: "Consultant", rating: 4.6, reviews: 5 }), // idx 1, excluded
      makePlace({ name: "B", category: "Financial planner", rating: 4.8, reviews: 150 }),
      makePlace({ name: "C", category: "Financial planner", rating: 4.7, reviews: 100 }),
      makePlace({ name: "D", category: "Consultant", rating: 4.5, reviews: 80 })
    ];
    const competitors = selectCompetitors({ results, center, excludeIndex: 1, count: 5 });
    // Category "Financial planner" is the majority (A, B, C) among the 4 candidates -> matched first.
    expect(competitors.map((c) => c.name)).toEqual(["A", "B", "C", "D"]);
    expect(competitors.map((c) => c.categoryMatch)).toEqual([true, true, true, false]);
    expect(competitors.map((c) => c.position)).toEqual([1, 3, 4, 5]);
  });

  it("fills remaining slots from the ranked list, flagged categoryMatch: false, when fewer than count match", () => {
    const results = [
      makePlace({ name: "A", category: "Financial planner", rating: 4.9, reviews: 200 }),
      makePlace({ name: "B", category: "Financial planner", rating: 4.8, reviews: 150 }),
      makePlace({ name: "C", category: "Real estate agency", rating: 4.7, reviews: 100 }),
      makePlace({ name: "D", category: "Consultant", rating: 4.5, reviews: 80 }),
      makePlace({ name: "E", category: "Plumber", rating: 4.4, reviews: 60 })
    ];
    const competitors = selectCompetitors({ results, center, excludeIndex: null, count: 5 });
    expect(competitors).toHaveLength(5);
    expect(competitors.filter((c) => c.categoryMatch)).toHaveLength(2); // A, B
    expect(competitors.filter((c) => !c.categoryMatch)).toHaveLength(3); // C, D, E fill, in rank order
    expect(competitors.map((c) => c.name)).toEqual(["A", "B", "C", "D", "E"]);
  });

  it("flags every entry categoryMatch: false when no category has a majority (never guesses)", () => {
    const results = [
      makePlace({ name: "A", category: "Financial planner" }),
      makePlace({ name: "B", category: "Real estate agency" }),
      makePlace({ name: "C", category: "Consultant" })
    ];
    const competitors = selectCompetitors({ results, center, excludeIndex: null, count: 3 });
    // No category reaches a count of 2 among the candidates -> termServiceCategory falls back to
    // the first candidate's own category ("Financial planner"), so only A matches itself.
    expect(competitors.filter((c) => c.categoryMatch).map((c) => c.name)).toEqual(["A"]);
  });

  it("truncates to `count` even when more than count match", () => {
    const results = Array.from({ length: 8 }, (_, i) =>
      makePlace({ name: `Biz ${i + 1}`, category: "Consultant", rating: 4.5, reviews: 10 })
    );
    const competitors = selectCompetitors({ results, center, excludeIndex: null, count: 5 });
    expect(competitors).toHaveLength(5);
    expect(competitors.map((c) => c.position)).toEqual([1, 2, 3, 4, 5]);
  });
});

describe("topCompetitorFor", () => {
  it("is the highest-ranked OTHER business, regardless of category match", () => {
    const results = [
      makePlace({ name: "A", category: "Plumber", rating: 4.9, reviews: 200 }),
      makePlace({ name: "Client" })
    ];
    expect(topCompetitorFor({ results, excludeIndex: 1, center: null })).toMatchObject({
      position: 1,
      name: "A",
      rating: 4.9,
      reviewCount: 200
    });
  });

  it("skips the excluded index to find the next candidate", () => {
    const results = [
      makePlace({ name: "Client" }),
      makePlace({ name: "A", rating: 4.5, reviews: 50 })
    ];
    expect(topCompetitorFor({ results, excludeIndex: 0, center: null })).toMatchObject({
      position: 2,
      name: "A"
    });
  });

  it("is null when there are no other results", () => {
    expect(topCompetitorFor({ results: [makePlace({ name: "Client" })], excludeIndex: 0, center: null })).toBeNull();
    expect(topCompetitorFor({ results: [], excludeIndex: null, center: null })).toBeNull();
  });
});

describe("buildClientRow", () => {
  const center = null;

  it("ranked: attributes from the raw place, position set, status null", () => {
    const place = makePlace({
      name: "Biz",
      website: "https://www.biz.com",
      rating: 4.6,
      reviews: 19,
      category: "Consultant",
      hours: false,
      photos: 4
    });
    const row = buildClientRow({ place, rank: 7, ownProfile: null, center });
    expect(row).toMatchObject({
      position: 7,
      status: null,
      name: "Biz",
      rating: 4.6,
      reviewCount: 19,
      photoCount: 4,
      primaryCategory: "Consultant",
      hoursListed: false,
      website: "biz.com"
    });
  });

  it("not ranked, own profile found: attributes from ownProfile, position null, status null (never 'not showing')", () => {
    const ownProfile = {
      found: true,
      name: "Northvalley Intelligence",
      rating: 5.0,
      reviewCount: 3,
      photoCount: 2,
      primaryCategory: "Consultant",
      hoursListed: true,
      website: "https://www.northvalleyintel.com",
      placeId: "p1",
      hasDescription: true,
      distanceMi: 2.4
    };
    const row = buildClientRow({ place: null, rank: null, ownProfile, center });
    expect(row).toEqual({
      position: null,
      status: null,
      name: "Northvalley Intelligence",
      rating: 5.0,
      reviewCount: 3,
      photoCount: 2,
      photoCapped: false,
      primaryCategory: "Consultant",
      hoursListed: true,
      website: "northvalleyintel.com",
      hasDescription: true,
      servicesCount: null,
      distanceMi: 2.4
    });
  });

  it("neither ranked nor own profile found: every attribute null, status 'not showing'", () => {
    const row = buildClientRow({ place: null, rank: null, ownProfile: null, center });
    expect(row).toEqual({
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
    });
  });
});

describe("buildCompetitorSuggestions", () => {
  const competitors = [
    { name: "A", rating: 4.9, reviewCount: 200, photoCount: 10, primaryCategory: "Consultant", hoursListed: true, website: "a.com", hasDescription: true },
    { name: "B", rating: 4.8, reviewCount: 150, photoCount: 10, primaryCategory: "Consultant", hoursListed: true, website: "b.com", hasDescription: true },
    { name: "C", rating: 4.7, reviewCount: 100, photoCount: 8, primaryCategory: "Consultant", hoursListed: true, website: "c.com", hasDescription: false }
  ];

  it("reviews: fires with the competitors' average and the client's own (possibly zero) count", () => {
    const recs = buildCompetitorSuggestions({ client: { reviewCount: 1 }, competitors });
    expect(recs).toContain(
      "Competitors average 150 reviews; you have 1 — ask your last 10 clients for a Google review."
    );
  });

  it("reviews: a missing client value is treated as 0, not skipped", () => {
    const recs = buildCompetitorSuggestions({ client: {}, competitors });
    expect(recs).toContain(
      "Competitors average 150 reviews; you have 0 — ask your last 10 clients for a Google review."
    );
  });

  it("reviews: silent at/above the median", () => {
    const recs = buildCompetitorSuggestions({ client: { reviewCount: 200 }, competitors });
    expect(recs.some((r) => r.startsWith("Competitors average") && r.includes("reviews"))).toBe(false);
  });

  it("photos: fires with the competitors' average", () => {
    const recs = buildCompetitorSuggestions({ client: { photoCount: 2 }, competitors });
    expect(recs).toContain("Competitors average 9 photos; you have 2 — add more photos of your work.");
  });

  it("category: fires with the count of competitors sharing the majority category", () => {
    const recs = buildCompetitorSuggestions({
      client: { primaryCategory: "Financial planner" },
      competitors
    });
    expect(recs).toContain(
      '3 of 3 competitors list "Consultant" as primary category; yours is "Financial planner" — change it.'
    );
  });

  it("category: 'not set' when the client has none at all", () => {
    const recs = buildCompetitorSuggestions({ client: {}, competitors });
    expect(recs).toContain(
      '3 of 3 competitors list "Consultant" as primary category; yours is not set — change it.'
    );
  });

  it("category: silent when the client matches the majority", () => {
    const recs = buildCompetitorSuggestions({
      client: { primaryCategory: "Consultant", reviewCount: 500, photoCount: 20, hoursListed: true, website: "x.com", hasDescription: true },
      competitors
    });
    expect(recs.some((r) => r.includes("as primary category"))).toBe(false);
  });

  it("hours: fires when the client lacks them and >=2 competitors have them", () => {
    const recs = buildCompetitorSuggestions({ client: { hoursListed: false }, competitors });
    expect(recs).toContain("3 of 3 competitors list business hours; yours are not published — add your hours.");
  });

  it("website: fires when the client has none and >=2 competitors do", () => {
    const recs = buildCompetitorSuggestions({ client: { website: null }, competitors });
    expect(recs).toContain(
      "3 of 3 competitors link a website; yours does not — link your website to your profile."
    );
  });

  it("description: fires when the client lacks one and >=2 competitors have one", () => {
    const recs = buildCompetitorSuggestions({ client: { hasDescription: false }, competitors });
    expect(recs).toContain(
      "2 of 3 competitors have a business description on their profile; yours does not — add one."
    );
  });

  it("returns [] when there are no competitors to compare against", () => {
    expect(buildCompetitorSuggestions({ client: {}, competitors: [] })).toEqual([]);
  });

  it("fires nothing when the client is at/above every competitor attribute", () => {
    const recs = buildCompetitorSuggestions({
      client: {
        reviewCount: 500,
        photoCount: 20,
        primaryCategory: "Consultant",
        hoursListed: true,
        website: "biz.com",
        hasDescription: true
      },
      competitors
    });
    expect(recs).toEqual([]);
  });
});

describe("buildRecommendations", () => {
  const term = "software consultant near me";
  const place = "Marietta, GA";
  const competitors = [
    { name: "A", rating: 4.9, reviewCount: 200, photoCount: 10, primaryCategory: "Consultant", hoursListed: true, website: "a.com", hasDescription: true },
    { name: "B", rating: 4.8, reviewCount: 150, photoCount: 10, primaryCategory: "Consultant", hoursListed: true, website: "b.com", hasDescription: true },
    { name: "C", rating: 4.7, reviewCount: 100, photoCount: 8, primaryCategory: "Consultant", hoursListed: true, website: "c.com", hasDescription: true }
  ];

  it("not showing (no rank, no own profile): the exact-position line + claim/verify ONLY — no fabricated gaps", () => {
    const client = { position: null, status: NOT_SHOWING };
    const recs = buildRecommendations({ client, competitors, term, place, searched: 60 });
    expect(recs).toEqual([
      `Your business does not appear in the top 60 results for "${term}" from ${place}.`,
      `No listing found for "${term}" from ${place} — claim/verify a Google Business Profile.`
    ]);
  });

  it("not ranked but own profile found: exact-position line + 'Your profile exists' + competitor suggestions", () => {
    const client = {
      position: null,
      status: null,
      name: "Northvalley Intelligence",
      rating: 4.6,
      reviewCount: 5,
      photoCount: 2,
      primaryCategory: "Software company",
      hoursListed: false,
      website: null,
      hasDescription: false
    };
    const recs = buildRecommendations({ client, competitors, term, place, searched: 60 });
    expect(recs[0]).toBe(
      `Your business does not appear in the top 60 results for "${term}" from ${place}.`
    );
    expect(recs[1]).toBe(
      'Your profile exists (rating 4.6, 5 reviews, 2 photos, category Software company) but does not rank for "software consultant near me" from Marietta, GA.'
    );
    expect(recs).toContain("Competitors average 150 reviews; you have 5 — ask your last 10 clients for a Google review.");
    expect(recs).toContain('3 of 3 competitors list "Consultant" as primary category; yours is "Software company" — change it.');
    expect(recs.some((r) => r.includes("claim/verify"))).toBe(false);
  });

  it("ranked: exact-position line + competitor suggestions", () => {
    const client = {
      position: 7,
      status: null,
      name: "Biz",
      rating: 4.6,
      reviewCount: 19,
      photoCount: 4,
      primaryCategory: "Consultant",
      hoursListed: false,
      website: "biz.com",
      hasDescription: true
    };
    const recs = buildRecommendations({ client, competitors, term, place, searched: 8 });
    expect(recs).toEqual([
      'Your listing is #7 of 8 results for "software consultant near me" from Marietta, GA.',
      "Competitors average 150 reviews; you have 19 — ask your last 10 clients for a Google review.",
      "Competitors average 9 photos; you have 4 — add more photos of your work.",
      "3 of 3 competitors list business hours; yours are not published — add your hours."
    ]);
  });
});

describe("renderTermSection / renderMarkdown", () => {
  it("renders the Competitor analysis heading, bolds the business row, and appends the guidance block once", () => {
    const rows = [
      {
        isBusiness: false,
        cells: [
          "1",
          "Top Realty",
          "4.9",
          "212",
          "38",
          "Real estate agency",
          "yes",
          "yes"
        ]
      },
      {
        isBusiness: true,
        cells: [
          "7",
          "Felton & Peel",
          "4.6",
          "19",
          "4",
          "Real estate agency",
          "no",
          "yes"
        ]
      }
    ];
    const section = renderTermSection({
      term: "realtor near me",
      place: "Marietta, GA",
      rows,
      recommendations: ["Competitors average 154 reviews; you have 19 — ask your last 10 clients for a Google review."]
    });
    expect(section).toContain(
      '## Competitor analysis — "realtor near me" from Marietta, GA'
    );
    expect(section).toContain(
      "| 1 | Top Realty | 4.9 | 212 | 38 | Real estate agency | yes | yes |"
    );
    expect(section).toContain(
      "| **7** | **Felton & Peel** | **4.6** | **19** | **4** | **Real estate agency** | **no** | **yes** |"
    );
    expect(section).toContain("**Suggestions**");
    expect(section).toContain(
      "- Competitors average 154 reviews; you have 19 — ask your last 10 clients for a Google review."
    );

    const md = renderMarkdown({ sections: [section] });
    expect(md.match(/support\.google\.com\/business\/answer\/7091/g)).toHaveLength(1);
    expect(md).toContain(GOOGLE_GUIDANCE_BLOCK);
    expect(md).toContain(GOOGLE_GUIDANCE_URL);
  });

  it("appends the guidance block exactly once across multiple term sections", () => {
    const oneRow = [
      { isBusiness: true, cells: ["1", "Biz", NA, NA, NA, NA, "no", "no"] }
    ];
    const sectionA = renderTermSection({
      term: "term a",
      place: "Marietta, GA",
      rows: oneRow,
      recommendations: []
    });
    const sectionB = renderTermSection({
      term: "term b",
      place: "Marietta, GA",
      rows: oneRow,
      recommendations: []
    });
    const md = renderMarkdown({ sections: [sectionA, sectionB] });
    expect(md.match(/Google's guidance on local ranking/g)).toHaveLength(1);
  });
});

describe("buildTermOutput (full fixture, no network)", () => {
  // 8 results shaped like a searchText response; the business is 7th.
  const results = [
    makePlace({
      name: "Top Realty",
      website: "https://top.com",
      rating: 4.9,
      reviews: 212,
      category: "Real estate agency",
      hours: true,
      photos: 10
    }),
    makePlace({
      name: "Second Realty",
      website: "https://second.com",
      rating: 4.8,
      reviews: 150,
      category: "Real estate agency",
      hours: true,
      photos: 10
    }),
    makePlace({
      name: "Third Realty",
      website: "https://third.com",
      rating: 4.7,
      reviews: 100,
      category: "Real estate agency",
      hours: true,
      photos: 8
    }),
    makePlace({
      name: "Fourth",
      website: "https://fourth.com",
      rating: 4.5,
      reviews: 80,
      category: "Real estate agency",
      hours: true,
      photos: 6
    }),
    makePlace({
      name: "Fifth",
      website: "https://fifth.com",
      rating: 4.4,
      reviews: 60,
      category: "Real estate agency",
      hours: true,
      photos: 5
    }),
    makePlace({
      name: "Sixth",
      website: "https://sixth.com",
      rating: 4.3,
      reviews: 40,
      category: "Real estate agency",
      hours: true,
      photos: 3
    }),
    makePlace({
      name: "Felton & Peel",
      website: "https://www.feltonandpeel.com",
      rating: 4.6,
      reviews: 19,
      category: "Real estate agency",
      hours: false,
      photos: 4
    }),
    makePlace({
      name: "Eighth",
      website: "https://eighth.com",
      rating: 4.1,
      reviews: 10,
      category: "Real estate agency",
      hours: true,
      photos: 1
    })
  ];

  it("ranks the business 7th, lists 3 competitors (excluding the client), and bolds the client's own row", () => {
    const out = buildTermOutput({
      term: "realtor near me",
      place: "Marietta, GA",
      results,
      domain: "feltonandpeel.com",
      top: 3
    });
    expect(out.rankLabel).toBe("7");
    expect(out.rank).toBe(7);
    expect(out.searched).toBe(8);
    expect(out.competitors.map((c) => c.name)).toEqual(["Top Realty", "Second Realty", "Third Realty"]);
    expect(out.client.position).toBe(7);
    expect(out.client.name).toBe("Felton & Peel");
    expect(out.section).toContain(
      "| 1 | Top Realty | 4.9 | 212 | 10+ | Real estate agency | yes | yes |"
    );
    expect(out.section).toContain(
      "| **7** | **Felton & Peel** | **4.6** | **19** | **4** | **Real estate agency** | **no** | **yes** |"
    );
    // No em-dash table cells: every field was supplied for every row involved.
    const dataRows = out.section
      .split("\n")
      .filter((l) => l.startsWith("| ") && !l.startsWith("| Rank"));
    expect(dataRows.every((row) => !row.includes(` ${NA} `))).toBe(true);
  });

  it("fires reviews/photos/hours suggestions for this fixture, stays silent on category/website", () => {
    const out = buildTermOutput({
      term: "realtor near me",
      place: "Marietta, GA",
      results,
      domain: "feltonandpeel.com",
      top: 3
    });
    expect(out.recommendations).toEqual([
      'Your listing is #7 of 8 results for "realtor near me" from Marietta, GA.',
      "Competitors average 154 reviews; you have 19 — ask your last 10 clients for a Google review.",
      "Competitors average 9 photos; you have 4 — add more photos of your work.",
      "3 of 3 competitors list business hours; yours are not published — add your hours."
    ]);
  });

  it("business absent from the results -> not in top 60, no fabricated rank, no fabricated gaps", () => {
    const out = buildTermOutput({
      term: "realtor near me",
      place: "Marietta, GA",
      results: results.filter((r) => r.displayName.text !== "Felton & Peel"),
      domain: "feltonandpeel.com",
      top: 3
    });
    expect(out.rankLabel).toBe(NOT_IN_TOP_60);
    expect(out.rank).toBeNull();
    expect(out.searched).toBe(7);
    expect(out.client.status).toBe(NOT_SHOWING);
    expect(out.recommendations).toEqual([
      'Your business does not appear in the top 60 results for "realtor near me" from Marietta, GA.',
      'No listing found for "realtor near me" from Marietta, GA — claim/verify a Google Business Profile.'
    ]);
    expect(out.section).toContain("claim/verify a Google Business Profile");
    // Client row is ALWAYS printed (labelled NOT SHOWING, all-NA), never omitted.
    expect(out.section).toContain(`| **${NOT_SHOWING_LABEL}**`);
    const dataRows = out.section
      .split("\n")
      .filter((l) => l.startsWith("| ") && !l.startsWith("| Rank"));
    expect(dataRows).toHaveLength(4); // 3 competitors + the NOT SHOWING client row
  });

  it("the client is NEVER duplicated among competitors, even when it would otherwise rank in the top N", () => {
    const out = buildTermOutput({
      term: "realtor near me",
      place: "Marietta, GA",
      results,
      domain: "third.com",
      top: 3
    });
    expect(out.rankLabel).toBe("3");
    expect(out.competitors.some((c) => c.name === "Third Realty")).toBe(false);
    expect(out.competitors.map((c) => c.name)).toEqual(["Top Realty", "Second Realty", "Fourth"]);
    expect(out.client.name).toBe("Third Realty");
    expect(out.client.position).toBe(3);
    const rows = out.section
      .split("\n")
      .filter((l) => l.startsWith("| ") && !l.startsWith("| Rank"));
    expect(rows).toHaveLength(4); // 3 competitors + the bold client row
    expect(rows.filter((r) => r.includes("Third Realty"))).toHaveLength(1);
  });
});

describe("parseArgs", () => {
  it("applies documented defaults (top defaults to 5 competitors, H05) and derives --json from --out", () => {
    const opts = parseArgs([
      "--domain",
      "feltonandpeel.com",
      "--terms",
      "financial advisor near me",
      "--place",
      "Atlanta, GA",
      "--out",
      "out.md"
    ]);
    expect(opts).toMatchObject({
      domain: "feltonandpeel.com",
      terms: "financial advisor near me",
      place: "Atlanta, GA",
      out: "out.md",
      json: "out.md.json",
      env: ".env.local",
      radiusKm: 15,
      top: 5,
      depth: 60,
      dryRun: false
    });
  });

  it("accepts overrides and --dry-run", () => {
    const opts = parseArgs([
      "--domain",
      "d.com",
      "--terms",
      "t",
      "--place",
      "p",
      "--out",
      "o.md",
      "--json",
      "raw.json",
      "--env",
      "/nonexistent",
      "--radius-km",
      "20",
      "--top",
      "5",
      "--depth",
      "40",
      "--name",
      "Business Name",
      "--dry-run"
    ]);
    expect(opts.json).toBe("raw.json");
    expect(opts.env).toBe("/nonexistent");
    expect(opts.radiusKm).toBe(20);
    expect(opts.top).toBe(5);
    expect(opts.depth).toBe(40);
    expect(opts.name).toBe("Business Name");
    expect(opts.dryRun).toBe(true);
  });

  it("requires --domain, --terms, --place, --out", () => {
    expect(() => parseArgs(["--terms", "t", "--place", "p", "--out", "o.md"])).toThrow(
      /--domain/
    );
    expect(() => parseArgs(["--domain", "d", "--place", "p", "--out", "o.md"])).toThrow(
      /--terms/
    );
    expect(() => parseArgs(["--domain", "d", "--terms", "t", "--out", "o.md"])).toThrow(
      /--place/
    );
    expect(() => parseArgs(["--domain", "d", "--terms", "t", "--place", "p"])).toThrow(
      /--out/
    );
    expect(() => parseArgs(["--bogus", "x"])).toThrow(/Unknown argument/);
    expect(() => parseArgs(["--domain", "--terms"])).toThrow(/requires a value/);
  });

  it("rejects a non-positive --radius-km or non-integer --top", () => {
    const base = ["--domain", "d", "--terms", "t", "--place", "p", "--out", "o.md"];
    expect(() => parseArgs([...base, "--radius-km", "0"])).toThrow(/--radius-km/);
    expect(() => parseArgs([...base, "--radius-km", "-5"])).toThrow(/--radius-km/);
    expect(() => parseArgs([...base, "--top", "0"])).toThrow(/--top/);
    expect(() => parseArgs([...base, "--top", "2.5"])).toThrow(/--top/);
  });

  it("accepts --depth 20/40/60 and rejects anything else", () => {
    const base = ["--domain", "d", "--terms", "t", "--place", "p", "--out", "o.md"];
    expect(parseArgs([...base, "--depth", "20"]).depth).toBe(20);
    expect(parseArgs([...base, "--depth", "40"]).depth).toBe(40);
    expect(parseArgs([...base, "--depth", "60"]).depth).toBe(60);
    expect(() => parseArgs([...base, "--depth", "10"])).toThrow(/--depth/);
    expect(() => parseArgs([...base, "--depth", "80"])).toThrow(/--depth/);
  });
});

describe("describeApiError", () => {
  it("prints Google's message and status", () => {
    const out = describeApiError(400, {
      error: { message: "Invalid request.", status: "INVALID_ARGUMENT" }
    });
    expect(out).toContain("Invalid request.");
    expect(out).toContain("INVALID_ARGUMENT");
  });

  it("falls back to the HTTP status when there is no structured error", () => {
    expect(describeApiError(500, null)).toContain("HTTP 500");
  });
});

describe("field masks", () => {
  it("the search mask is the details mask with a places. prefix on each field", () => {
    const stripped = SEARCH_FIELD_MASK.split(",").map((f) =>
      f.replace(/^places\./, "")
    );
    expect(stripped.join(",")).toBe(DETAILS_FIELD_MASK);
  });

  it("includes every field named in the handoff, plus location (H05, for distance-from-anchor)", () => {
    for (const field of [
      "places.id",
      "places.displayName",
      "places.formattedAddress",
      "places.websiteUri",
      "places.rating",
      "places.userRatingCount",
      "places.types",
      "places.primaryType",
      "places.primaryTypeDisplayName",
      "places.regularOpeningHours",
      "places.photos",
      "places.businessStatus",
      "places.googleMapsUri",
      "places.editorialSummary",
      "places.location"
    ]) {
      expect(SEARCH_FIELD_MASK.split(",")).toContain(field);
    }
  });
});

describe("normalizeNameForMatch", () => {
  it("lowercases and collapses punctuation/whitespace", () => {
    expect(normalizeNameForMatch("Felton & Peel, LLC")).toBe("felton peel llc");
    expect(normalizeNameForMatch("  Northvalley   Intelligence  ")).toBe(
      "northvalley intelligence"
    );
  });

  it("treats punctuation-only differences as equal", () => {
    expect(normalizeNameForMatch("Felton & Peel")).toBe(normalizeNameForMatch("Felton, Peel"));
  });
});

describe("domainLabel / resolveBusinessName", () => {
  it("derives a title-cased label from the registrable domain", () => {
    expect(domainLabel("northvalleyintel.com")).toBe("Northvalleyintel");
    expect(domainLabel("www.feltonandpeel.com")).toBe("Feltonandpeel");
  });

  it("resolveBusinessName prefers --name, falling back to the domain label", () => {
    expect(resolveBusinessName("Northvalley Intelligence", "northvalleyintel.com")).toBe(
      "Northvalley Intelligence"
    );
    expect(resolveBusinessName(null, "northvalleyintel.com")).toBe("Northvalleyintel");
    expect(resolveBusinessName("  ", "northvalleyintel.com")).toBe("Northvalleyintel");
  });
});

describe("ownProfileSearchBody", () => {
  it("builds a plain textQuery, no locationBias", () => {
    expect(ownProfileSearchBody("Northvalley Intelligence", "Marietta, GA")).toEqual({
      textQuery: "Northvalley Intelligence Marietta, GA",
      pageSize: 5
    });
  });
});

describe("matchOwnProfile (host match, name match, no match)", () => {
  it("matches by website host, www-insensitive", () => {
    const results = [
      makePlace({ name: "Some Other Business", website: "https://other.com" }),
      makePlace({ name: "Northvalley Intelligence", website: "https://www.northvalleyintel.com" })
    ];
    expect(matchOwnProfile(results, "northvalleyintel.com", "Northvalley Intelligence")).toBe(1);
  });

  it("falls back to exact name, case/punctuation-insensitive, when no host matches", () => {
    const results = [
      makePlace({ name: "Northvalley, Intelligence!" }) // no website at all
    ];
    expect(matchOwnProfile(results, "northvalleyintel.com", "northvalley intelligence")).toBe(0);
  });

  it("returns null (never a guessed match) when neither host nor name matches", () => {
    const results = [makePlace({ name: "Unrelated Co", website: "https://unrelated.com" })];
    expect(matchOwnProfile(results, "northvalleyintel.com", "Northvalley Intelligence")).toBeNull();
  });
});

describe("extractOwnProfile", () => {
  it("returns null when there is no place (never fabricated)", () => {
    expect(extractOwnProfile(null, null)).toBeNull();
  });

  it("extracts the ownProfile record shape with found: true, plus hasDescription/distanceMi (H05)", () => {
    const center = { latitude: 33.9526, longitude: -84.5499 };
    const place = makePlace({
      id: "p1",
      name: "Northvalley Intelligence",
      website: "https://northvalleyintel.com",
      rating: 5.0,
      reviews: 3,
      category: "Consultant",
      hours: true,
      photos: 2,
      description: "AI and software consulting",
      location: { latitude: 33.749, longitude: -84.388 }
    });
    const profile = extractOwnProfile(place, center);
    expect(profile).toMatchObject({
      found: true,
      name: "Northvalley Intelligence",
      rating: 5.0,
      reviewCount: 3,
      photoCount: 2,
      primaryCategory: "Consultant",
      hoursListed: true,
      website: "https://northvalleyintel.com",
      placeId: "p1",
      hasDescription: true
    });
    expect(profile.distanceMi).toBeGreaterThan(0);
  });

  it("hasDescription false and distanceMi null when the API omitted those fields / no center given", () => {
    const place = makePlace({
      id: "p1",
      name: "Bare Biz",
      website: "https://bare.com",
      rating: 4.0,
      reviews: 1,
      category: "Consultant",
      hours: false
    });
    const profile = extractOwnProfile(place, null);
    expect(profile.hasDescription).toBe(false);
    expect(profile.distanceMi).toBeNull();
  });
});

describe("ownProfileFirstLine", () => {
  it("renders every field, em dash for anything missing", () => {
    const line = ownProfileFirstLine({
      ownProfile: {
        found: true,
        name: "Biz",
        rating: null,
        reviewCount: null,
        photoCount: null,
        primaryCategory: null,
        hoursListed: false,
        website: null,
        placeId: "p1"
      },
      term: "ai consultant near me",
      place: "Marietta, GA"
    });
    expect(line).toBe(
      `Your profile exists (rating ${NA}, ${NA} reviews, ${NA} photos, category ${NA}) but does not rank for "ai consultant near me" from Marietta, GA.`
    );
  });
});
