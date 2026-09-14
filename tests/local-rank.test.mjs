import { describe, expect, it } from "vitest";

import {
  DETAILS_FIELD_MASK,
  GOOGLE_GUIDANCE_BLOCK,
  GOOGLE_GUIDANCE_URL,
  NA,
  NOT_IN_TOP_20,
  SEARCH_FIELD_MASK,
  buildRecommendations,
  buildTermOutput,
  describeApiError,
  extractPlaceData,
  formatRow,
  geocodeAddressParam,
  hostFromUrl,
  kmToMeters,
  matchBusiness,
  needsDetails,
  normalizeDomain,
  parseArgs,
  parseEnvFile,
  parseTermList,
  renderMarkdown,
  renderTermSection,
  searchTextBody
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
  photos
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
    expect(formatRow(NOT_IN_TOP_20, null)).toEqual([
      NOT_IN_TOP_20,
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

describe("buildRecommendations", () => {
  const term = "realtor near me";
  const place = "Marietta, GA";
  const top3 = [
    extractPlaceData(
      makePlace({
        name: "A",
        rating: 4.9,
        reviews: 212,
        category: "Real estate agency",
        hours: true,
        photos: 10
      })
    ),
    extractPlaceData(
      makePlace({
        name: "B",
        rating: 4.8,
        reviews: 150,
        category: "Real estate agency",
        hours: true,
        photos: 10
      })
    ),
    extractPlaceData(
      makePlace({
        name: "C",
        rating: 4.7,
        reviews: 100,
        category: "Real estate agency",
        hours: true,
        photos: 8
      })
    )
  ];

  it("not-in-top-20 short-circuits to a single claim/verify recommendation", () => {
    const recs = buildRecommendations({
      business: null,
      businessRankLabel: NOT_IN_TOP_20,
      top3,
      term,
      place
    });
    expect(recs).toEqual([
      `No listing found for "${term}" from ${place} — claim/verify a Google Business Profile.`
    ]);
  });

  it("reviews: fires when below the top-3 median, with the top-3 average and the business count", () => {
    const low = extractPlaceData(
      makePlace({
        name: "Biz",
        rating: 4.6,
        reviews: 19,
        category: "Real estate agency",
        hours: true,
        photos: 10
      })
    );
    const recs = buildRecommendations({
      business: low,
      businessRankLabel: "7",
      top3,
      term,
      place
    });
    expect(recs).toContain(
      "Get more Google reviews — the top 3 average 154; you have 19."
    );
  });

  it("reviews: stays silent when at/above the top-3 median", () => {
    const high = extractPlaceData(
      makePlace({
        name: "Biz",
        rating: 4.6,
        reviews: 200,
        category: "Real estate agency",
        hours: true,
        photos: 10
      })
    );
    const recs = buildRecommendations({
      business: high,
      businessRankLabel: "4",
      top3,
      term,
      place
    });
    expect(recs.some((r) => r.startsWith("Get more Google reviews"))).toBe(false);
  });

  it("rating: fires only when below 4.5 AND below the top-3 min", () => {
    const lowRating = extractPlaceData(
      makePlace({
        name: "Biz",
        rating: 4.2,
        reviews: 200,
        category: "Real estate agency",
        hours: true,
        photos: 10
      })
    );
    const recs = buildRecommendations({
      business: lowRating,
      businessRankLabel: "4",
      top3,
      term,
      place
    });
    expect(recs).toContain("Respond to reviews; rating 4.2 vs top-3 4.7.");
  });

  it("rating: stays silent at 4.6 even though it's below the top-3 min (not below 4.5)", () => {
    const okRating = extractPlaceData(
      makePlace({
        name: "Biz",
        rating: 4.6,
        reviews: 200,
        category: "Real estate agency",
        hours: true,
        photos: 10
      })
    );
    const recs = buildRecommendations({
      business: okRating,
      businessRankLabel: "4",
      top3,
      term,
      place
    });
    expect(recs.some((r) => r.startsWith("Respond to reviews"))).toBe(false);
  });

  it("photos: fires when below the top-3 median", () => {
    const fewPhotos = extractPlaceData(
      makePlace({
        name: "Biz",
        rating: 4.6,
        reviews: 200,
        category: "Real estate agency",
        hours: true,
        photos: 4
      })
    );
    const recs = buildRecommendations({
      business: fewPhotos,
      businessRankLabel: "4",
      top3,
      term,
      place
    });
    expect(recs).toContain("Add more pictures — top 3 carry 10; you have 4.");
  });

  it("photos: stays silent at/above the top-3 median", () => {
    const manyPhotos = extractPlaceData(
      makePlace({
        name: "Biz",
        rating: 4.6,
        reviews: 200,
        category: "Real estate agency",
        hours: true,
        photos: 10
      })
    );
    const recs = buildRecommendations({
      business: manyPhotos,
      businessRankLabel: "4",
      top3,
      term,
      place
    });
    expect(recs.some((r) => r.startsWith("Add more pictures"))).toBe(false);
  });

  it("category: fires when it differs from the top-3 majority", () => {
    const diffCategory = extractPlaceData(
      makePlace({
        name: "Biz",
        rating: 4.6,
        reviews: 200,
        category: "Financial planner",
        hours: true,
        photos: 10
      })
    );
    const recs = buildRecommendations({
      business: diffCategory,
      businessRankLabel: "4",
      top3,
      term,
      place
    });
    expect(recs).toContain(
      "Set primary category to Real estate agency (top 3 use it)."
    );
  });

  it("category: stays silent when it matches the top-3 majority", () => {
    const sameCategory = extractPlaceData(
      makePlace({
        name: "Biz",
        rating: 4.6,
        reviews: 200,
        category: "Real estate agency",
        hours: true,
        photos: 10
      })
    );
    const recs = buildRecommendations({
      business: sameCategory,
      businessRankLabel: "4",
      top3,
      term,
      place
    });
    expect(recs.some((r) => r.startsWith("Set primary category"))).toBe(false);
  });

  it("hours: fires when the business has none while the top 3 do", () => {
    const noHours = extractPlaceData(
      makePlace({
        name: "Biz",
        rating: 4.6,
        reviews: 200,
        category: "Real estate agency",
        hours: false,
        photos: 10
      })
    );
    const recs = buildRecommendations({
      business: noHours,
      businessRankLabel: "4",
      top3,
      term,
      place
    });
    expect(recs).toContain("Publish business hours.");
  });

  it("hours: stays silent when the business has them", () => {
    const hasHours = extractPlaceData(
      makePlace({
        name: "Biz",
        rating: 4.6,
        reviews: 200,
        category: "Real estate agency",
        hours: true,
        photos: 10
      })
    );
    const recs = buildRecommendations({
      business: hasHours,
      businessRankLabel: "4",
      top3,
      term,
      place
    });
    expect(recs.some((r) => r.startsWith("Publish business hours"))).toBe(false);
  });

  it("website: fires when the business has none linked", () => {
    const noSite = extractPlaceData(
      makePlace({
        name: "Biz",
        rating: 4.6,
        reviews: 200,
        category: "Real estate agency",
        hours: true,
        photos: 10
      })
    );
    const recs = buildRecommendations({
      business: noSite,
      businessRankLabel: "4",
      top3,
      term,
      place
    });
    expect(recs).toContain("Link the website to the profile.");
  });

  it("website: stays silent when linked", () => {
    const withSite = extractPlaceData(
      makePlace({
        name: "Biz",
        website: "https://biz.com",
        rating: 4.6,
        reviews: 200,
        category: "Real estate agency",
        hours: true,
        photos: 10
      })
    );
    const recs = buildRecommendations({
      business: withSite,
      businessRankLabel: "4",
      top3,
      term,
      place
    });
    expect(recs.some((r) => r.startsWith("Link the website"))).toBe(false);
  });

  it("never fabricates a number when the top 3 are missing the underlying field", () => {
    const noDataTop3 = [
      extractPlaceData(makePlace({ name: "A" })),
      extractPlaceData(makePlace({ name: "B" }))
    ];
    const business = extractPlaceData(
      makePlace({
        name: "Biz",
        website: "https://biz.com",
        rating: 4.9,
        reviews: 500,
        hours: true,
        photos: 10
      })
    );
    const recs = buildRecommendations({
      business,
      businessRankLabel: "1",
      top3: noDataTop3,
      term,
      place
    });
    expect(recs).toEqual([]);
  });
});

describe("renderTermSection / renderMarkdown", () => {
  it("renders the table, bolds the business row, and appends the guidance block once", () => {
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
      recommendations: ["Get more Google reviews — the top 3 average 154; you have 19."]
    });
    expect(section).toContain(
      '## Where you are in the business listing — "realtor near me" from Marietta, GA'
    );
    expect(section).toContain(
      "| 1 | Top Realty | 4.9 | 212 | 38 | Real estate agency | yes | yes |"
    );
    expect(section).toContain(
      "| **7** | **Felton & Peel** | **4.6** | **19** | **4** | **Real estate agency** | **no** | **yes** |"
    );
    expect(section).toContain("**Recommendations**");
    expect(section).toContain(
      "- Get more Google reviews — the top 3 average 154; you have 19."
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

  it("ranks the business 7th, compares against the top 3, and fills every cell", () => {
    const out = buildTermOutput({
      term: "realtor near me",
      place: "Marietta, GA",
      results,
      domain: "feltonandpeel.com",
      top: 3
    });
    expect(out.rankLabel).toBe("7");
    expect(out.section).toContain(
      "| 1 | Top Realty | 4.9 | 212 | 10+ | Real estate agency | yes | yes |"
    );
    expect(out.section).toContain(
      "| 2 | Second Realty | 4.8 | 150 | 10+ | Real estate agency | yes | yes |"
    );
    expect(out.section).toContain(
      "| 3 | Third Realty | 4.7 | 100 | 8 | Real estate agency | yes | yes |"
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

  it("fires reviews/photos/hours recommendations for this fixture, stays silent on rating/category/website", () => {
    const out = buildTermOutput({
      term: "realtor near me",
      place: "Marietta, GA",
      results,
      domain: "feltonandpeel.com",
      top: 3
    });
    expect(out.recommendations).toEqual([
      "Get more Google reviews — the top 3 average 154; you have 19.",
      "Add more pictures — top 3 carry 10; you have 4.",
      "Publish business hours."
    ]);
  });

  it("business absent from the results -> not in top 20, no fabricated rank", () => {
    const out = buildTermOutput({
      term: "realtor near me",
      place: "Marietta, GA",
      results: results.filter((r) => r.displayName.text !== "Felton & Peel"),
      domain: "feltonandpeel.com",
      top: 3
    });
    expect(out.rankLabel).toBe(NOT_IN_TOP_20);
    expect(out.recommendations).toEqual([
      'No listing found for "realtor near me" from Marietta, GA — claim/verify a Google Business Profile.'
    ]);
    expect(out.section).toContain("claim/verify a Google Business Profile");
    // No business row is fabricated into the table when nothing matched.
    const dataRows = out.section
      .split("\n")
      .filter((l) => l.startsWith("| ") && !l.startsWith("| Rank"));
    expect(dataRows).toHaveLength(3);
  });

  it("business within the top N is bolded in place, not duplicated below", () => {
    const out = buildTermOutput({
      term: "realtor near me",
      place: "Marietta, GA",
      results,
      domain: "third.com",
      top: 3
    });
    expect(out.rankLabel).toBe("3");
    const rows = out.section
      .split("\n")
      .filter((l) => l.startsWith("| ") && !l.startsWith("| Rank"));
    expect(rows).toHaveLength(3);
    expect(rows[2]).toContain("**Third Realty**");
  });
});

describe("parseArgs", () => {
  it("applies documented defaults and derives --json from --out", () => {
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
      top: 3,
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
      "--name",
      "Business Name",
      "--dry-run"
    ]);
    expect(opts.json).toBe("raw.json");
    expect(opts.env).toBe("/nonexistent");
    expect(opts.radiusKm).toBe(20);
    expect(opts.top).toBe(5);
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

  it("includes every field named in the handoff", () => {
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
      "places.editorialSummary"
    ]) {
      expect(SEARCH_FIELD_MASK.split(",")).toContain(field);
    }
  });
});
