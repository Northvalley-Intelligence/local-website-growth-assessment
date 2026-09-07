import { afterEach, describe, expect, it } from "vitest";

import {
  DEFAULT_API_VERSION,
  adsBase,
  buildMetricsBody,
  describeApiError,
  formatYearMonthRange,
  getApiVersion,
  matchResultsToTerms,
  parseArgs,
  parseEnvFile,
  parseTerms,
  pctChange,
  pickGeoConstant,
  renderMarkdown,
  resolveApiVersion,
  rowFromMetrics,
  setApiVersion,
  titleFromTermsPath,
  yearMonthRangeFor
} from "../scripts/keyword-volumes.mjs";

const NA = "—";
const MINUS = "−";

/** Twelve months of volumes ending 2026-06, oldest first. */
function monthlyVolumes(values, startYear = 2025, startMonth = 7) {
  const names = [
    "JANUARY",
    "FEBRUARY",
    "MARCH",
    "APRIL",
    "MAY",
    "JUNE",
    "JULY",
    "AUGUST",
    "SEPTEMBER",
    "OCTOBER",
    "NOVEMBER",
    "DECEMBER"
  ];
  return values.map((monthlySearches, i) => {
    const offset = startMonth - 1 + i;
    return {
      year: String(startYear + Math.floor(offset / 12)),
      month: names[offset % 12],
      monthlySearches: String(monthlySearches)
    };
  });
}

describe("parseTerms", () => {
  it("splits one comma-separated line, trimming and preserving order", () => {
    expect(parseTerms("pest control,  termite control ,exterminator\n")).toEqual([
      "pest control",
      "termite control",
      "exterminator"
    ]);
  });

  it("drops empty segments and dedupes case-insensitively, keeping first casing", () => {
    expect(parseTerms("Pest Control, , pest control,,termite control,")).toEqual([
      "Pest Control",
      "termite control"
    ]);
  });

  it("ignores blank lines around the single content line", () => {
    expect(parseTerms("\n\n  pest control, exterminator  \n\n")).toEqual([
      "pest control",
      "exterminator"
    ]);
  });

  it("throws when the file has two or more non-empty lines", () => {
    expect(() => parseTerms("pest control\ntermite control")).toThrow(
      /exactly ONE comma-separated line, found 2/
    );
  });

  it("throws on an empty file", () => {
    expect(() => parseTerms("   \n\n")).toThrow(/empty/);
  });

  it("throws when nothing survives trimming", () => {
    expect(() => parseTerms(" , , ")).toThrow(/no usable terms/);
  });
});

describe("pctChange", () => {
  it("renders a signed percentage rounded to a whole percent", () => {
    expect(pctChange(104, 100)).toBe("+4%");
    expect(pctChange(98, 100)).toBe(`${MINUS}2%`);
    expect(pctChange(100, 100)).toBe("+0%");
    expect(pctChange(1500, 1000)).toBe("+50%");
  });

  it("accepts numeric strings (the API returns int64 as string)", () => {
    expect(pctChange("120", "100")).toBe("+20%");
  });

  it("returns null when a side is missing", () => {
    expect(pctChange(null, 100)).toBeNull();
    expect(pctChange(100, null)).toBeNull();
    expect(pctChange(undefined, undefined)).toBeNull();
    expect(pctChange(100, "")).toBeNull();
  });

  it("returns null when the base is zero (no divide-by-zero fabrication)", () => {
    expect(pctChange(100, 0)).toBeNull();
    expect(pctChange(0, 0)).toBeNull();
  });
});

describe("rowFromMetrics", () => {
  it("renders a full metrics block", () => {
    // 2025-06 = 1000 (YoY base); then 2025-07 .. 2026-06.
    const volumes = [
      ...monthlyVolumes([1000], 2025, 6),
      ...monthlyVolumes(
        [900, 900, 900, 900, 900, 900, 900, 900, 900, 1000, 1000, 1040],
        2025,
        7
      )
    ];
    const row = rowFromMetrics("pest control", {
      avgMonthlySearches: "673000",
      competition: "HIGH",
      lowTopOfPageBidMicros: "9120000",
      highTopOfPageBidMicros: "38400000",
      monthlySearchVolumes: volumes
    });
    expect(row[0]).toBe("pest control");
    expect(row[1]).toBe("673,000");
    expect(row[2]).toBe("+13%"); // mean(1000,1000,1040)/mean(900,900,1000) - 1
    expect(row[3]).toBe("+4%"); // 1040 / 1000 - 1
    expect(row[4]).toBe("HIGH");
    expect(row[5]).toBe("$9.12–$38.40");
  });

  it("renders missing bids as a single em dash", () => {
    const row = rowFromMetrics("termite control", {
      avgMonthlySearches: 1200,
      competition: "LOW",
      lowTopOfPageBidMicros: "4500000"
      // highTopOfPageBidMicros absent
    });
    expect(row[1]).toBe("1,200");
    expect(row[4]).toBe("LOW");
    expect(row[5]).toBe(NA);
  });

  it("renders missing monthly volumes as em dashes for 3-mo and YoY", () => {
    const row = rowFromMetrics("exterminator", {
      avgMonthlySearches: 90,
      competition: "MEDIUM",
      lowTopOfPageBidMicros: "1000000",
      highTopOfPageBidMicros: "2000000"
    });
    expect(row).toEqual(["exterminator", "90", NA, NA, "MEDIUM", "$1.00–$2.00"]);
  });

  it("renders fewer than six months as an em dash for 3-mo but still computes YoY", () => {
    const volumes = [
      ...monthlyVolumes([500], 2025, 6),
      ...monthlyVolumes([500, 500, 500, 550], 2026, 3)
    ];
    const row = rowFromMetrics("attic insulation", {
      avgMonthlySearches: 520,
      competition: "HIGH",
      monthlySearchVolumes: volumes
    });
    expect(row[2]).toBe(NA);
    expect(row[3]).toBe("+10%"); // 2026-06 550 vs 2025-06 500
  });

  it("maps COMPETITION_UNSPECIFIED / UNKNOWN to an em dash", () => {
    expect(rowFromMetrics("t", { competition: "COMPETITION_UNSPECIFIED" })[4]).toBe(NA);
    expect(rowFromMetrics("t", { competition: "UNKNOWN" })[4]).toBe(NA);
    expect(rowFromMetrics("t", {})[4]).toBe(NA);
  });

  it("renders an all-em-dash row when Google returned nothing for the term", () => {
    expect(rowFromMetrics("no data term", null)).toEqual([
      "no data term",
      NA,
      NA,
      NA,
      NA,
      NA
    ]);
  });

  // The H03 defect: with the 24-month window Google now returns, the latest
  // month's counterpart one year earlier is IN the window, so YoY computes.
  it("computes YoY from a 24-month window (2024-09 … 2026-08)", () => {
    const values = Array.from({ length: 24 }, (_, i) => (i === 23 ? 1000 : 800));
    const row = rowFromMetrics("pest control", {
      avgMonthlySearches: 820,
      competition: "HIGH",
      monthlySearchVolumes: monthlyVolumes(values, 2024, 9)
    });
    expect(row[3]).toBe("+25%"); // 2026-08 1000 vs 2025-08 800
    expect(row[2]).toBe("+8%"); // mean(800,800,1000)/mean(800,800,800) - 1
  });

  it("renders YoY as an em dash when only 12 months came back (the pre-H03 default)", () => {
    const values = Array.from({ length: 12 }, (_, i) => (i === 11 ? 1000 : 800));
    const row = rowFromMetrics("pest control", {
      avgMonthlySearches: 820,
      competition: "HIGH",
      monthlySearchVolumes: monthlyVolumes(values, 2025, 9)
    });
    expect(row[3]).toBe(NA); // 2025-08 is not in a 2025-09 … 2026-08 window
    expect(row[2]).toBe("+8%"); // 3-mo is unaffected
  });
});

describe("yearMonthRangeFor", () => {
  it("ends on the previous calendar month and starts 23 months before it", () => {
    // 2026-09-07 -> end 2026-AUGUST, start 2024-SEPTEMBER (24 months inclusive)
    expect(yearMonthRangeFor(new Date(2026, 8, 7))).toEqual({
      start: { year: 2024, month: "SEPTEMBER" },
      end: { year: 2026, month: "AUGUST" }
    });
  });

  it("rolls back over January correctly", () => {
    // 2026-01-15 -> end 2025-DECEMBER, start 2024-JANUARY
    expect(yearMonthRangeFor(new Date(2026, 0, 15))).toEqual({
      start: { year: 2024, month: "JANUARY" },
      end: { year: 2025, month: "DECEMBER" }
    });
  });

  it("handles February (end January, start two Februaries back)", () => {
    expect(yearMonthRangeFor(new Date(2026, 1, 1))).toEqual({
      start: { year: 2024, month: "FEBRUARY" },
      end: { year: 2026, month: "JANUARY" }
    });
  });

  it("always spans exactly 24 months inclusive", () => {
    const months = [
      "JANUARY",
      "FEBRUARY",
      "MARCH",
      "APRIL",
      "MAY",
      "JUNE",
      "JULY",
      "AUGUST",
      "SEPTEMBER",
      "OCTOBER",
      "NOVEMBER",
      "DECEMBER"
    ];
    for (let m = 0; m < 12; m += 1) {
      const { start, end } = yearMonthRangeFor(new Date(2026, m, 10));
      const span =
        end.year * 12 +
        months.indexOf(end.month) -
        (start.year * 12 + months.indexOf(start.month)) +
        1;
      expect(span).toBe(24);
    }
  });
});

describe("formatYearMonthRange", () => {
  it("renders the range for the dry-run summary", () => {
    expect(formatYearMonthRange(yearMonthRangeFor(new Date(2026, 8, 7)))).toBe(
      "2024-SEPTEMBER → 2026-AUGUST"
    );
  });
});

describe("API version", () => {
  afterEach(() => {
    setApiVersion(DEFAULT_API_VERSION);
  });

  it("defaults to v25 (v21 is retired and answers 404)", () => {
    expect(DEFAULT_API_VERSION).toBe("v25");
    expect(getApiVersion()).toBe("v25");
    expect(adsBase()).toBe("https://googleads.googleapis.com/v25");
  });

  it("resolves the default when nothing sets GOOGLE_ADS_API_VERSION", () => {
    expect(resolveApiVersion({}, {})).toBe("v25");
    expect(resolveApiVersion({ GOOGLE_ADS_API_VERSION: "  " }, {})).toBe("v25");
  });

  it("takes the override from an env file, through the same parser as the keys", () => {
    const parsed = parseEnvFile('GOOGLE_ADS_API_VERSION="v24"');
    expect(resolveApiVersion(parsed, {})).toBe("v24");
  });

  it("falls back to the process environment, with the env file winning", () => {
    expect(resolveApiVersion({}, { GOOGLE_ADS_API_VERSION: "v23" })).toBe("v23");
    expect(
      resolveApiVersion(
        { GOOGLE_ADS_API_VERSION: "v24" },
        { GOOGLE_ADS_API_VERSION: "v23" }
      )
    ).toBe("v24");
  });

  it("applies the override to the endpoint base URL", () => {
    setApiVersion("v22");
    expect(getApiVersion()).toBe("v22");
    expect(adsBase()).toBe("https://googleads.googleapis.com/v22");
    expect(adsBase("v25")).toBe("https://googleads.googleapis.com/v25");
  });

  it("treats a blank override as unset", () => {
    setApiVersion("");
    expect(getApiVersion()).toBe("v25");
  });
});

describe("buildMetricsBody", () => {
  it("requests 24 months via historicalMetricsOptions.yearMonthRange", () => {
    const range = yearMonthRangeFor(new Date(2026, 8, 7));
    const body = buildMetricsBody(["pest control"], ["geoTargetConstants/2840"], range);
    expect(body.historicalMetricsOptions).toEqual({
      includeAverageCpc: true,
      yearMonthRange: {
        start: { year: 2024, month: "SEPTEMBER" },
        end: { year: 2026, month: "AUGUST" }
      }
    });
  });

  it("keeps the rest of the request contract intact", () => {
    const body = buildMetricsBody(["a", "b"], ["geoTargetConstants/1014895"]);
    expect(body.keywords).toEqual(["a", "b"]);
    expect(body.language).toBe("languageConstants/1000");
    expect(body.geoTargetConstants).toEqual(["geoTargetConstants/1014895"]);
    expect(body.keywordPlanNetwork).toBe("GOOGLE_SEARCH");
  });
});

describe("matchResultsToTerms", () => {
  it("matches by exact text first", () => {
    const matched = matchResultsToTerms(
      ["pest control", "exterminator"],
      [
        { text: "pest control", keywordMetrics: { avgMonthlySearches: 1 } },
        { text: "exterminator", keywordMetrics: { avgMonthlySearches: 2 } }
      ]
    );
    expect(matched.get("pest control").keywordMetrics.avgMonthlySearches).toBe(1);
    expect(matched.get("exterminator").keywordMetrics.avgMonthlySearches).toBe(2);
  });

  it("falls back to closeVariants membership when Google folded a term", () => {
    const matched = matchResultsToTerms(
      ["pest control", "pest controls"],
      [
        {
          text: "pest control",
          closeVariants: ["pest controls", "pests control"],
          keywordMetrics: { avgMonthlySearches: 673000 }
        }
      ]
    );
    expect(matched.get("pest controls").keywordMetrics.avgMonthlySearches).toBe(673000);
  });

  it("is case-insensitive and yields null for unmatched terms", () => {
    const matched = matchResultsToTerms(
      ["Pest Control", "attic insulation"],
      [{ text: "pest control", keywordMetrics: {} }]
    );
    expect(matched.get("Pest Control")).not.toBeNull();
    expect(matched.get("attic insulation")).toBeNull();
  });
});

describe("renderMarkdown", () => {
  it("produces the exact demand-data.md shape", () => {
    const md = renderMarkdown({
      title: "garlandservices.net",
      pulled: "2026-09-07",
      national: {
        geoLabel: "United States",
        rows: [["pest control", "673,000", "+4%", `${MINUS}2%`, "HIGH", "$9.12–$38.40"]]
      },
      local: {
        geoLabel: "Cobb County, GA + Douglas County, GA",
        rows: [["pest control", "2,400", NA, NA, "HIGH", "$8.10–$30.00"]]
      }
    });

    expect(md).toBe(
      [
        "# Demand data — garlandservices.net (Keyword Planner, pulled 2026-09-07)",
        "",
        "## Lane A — National baseline (geo: United States)",
        "Caveat: national volumes describe category shape, not local demand.",
        "",
        "| term | avg mo searches | 3-mo | YoY | competition | bid low–high |",
        "|---|---|---|---|---|---|",
        `| pest control | 673,000 | +4% | ${MINUS}2% | HIGH | $9.12–$38.40 |`,
        "",
        "## Lane B — Local demand (geo: Cobb County, GA + Douglas County, GA)",
        "",
        "| term | avg mo searches | 3-mo | YoY | competition | bid low–high |",
        "|---|---|---|---|---|---|",
        `| pest control | 2,400 | ${NA} | ${NA} | HIGH | $8.10–$30.00 |`,
        "",
        "Source: Google Ads API v25 generateKeywordHistoricalMetrics · language English · network Google Search · pulled 2026-09-07",
        ""
      ].join("\n")
    );
  });

  it("keeps Lane B free of the national caveat", () => {
    const md = renderMarkdown({
      title: "x",
      pulled: "2026-01-01",
      national: { geoLabel: "United States", rows: [] },
      local: { geoLabel: "Cobb County, GA", rows: [] }
    });
    expect(md.match(/Caveat:/g)).toHaveLength(1);
  });

  it("prints the API version actually used in the Source line", () => {
    const md = renderMarkdown({
      title: "x",
      pulled: "2026-01-01",
      apiVersion: "v24",
      national: { geoLabel: "United States", rows: [] },
      local: { geoLabel: "Cobb County, GA", rows: [] }
    });
    expect(md).toContain("Source: Google Ads API v24 generateKeywordHistoricalMetrics");
  });
});

describe("parseEnvFile", () => {
  it("parses keys, strips matched quotes, skips comments and blanks", () => {
    const parsed = parseEnvFile(
      [
        "# a comment",
        "",
        'GOOGLE_ADS_DEVELOPER_TOKEN="dev-token"',
        "GOOGLE_ADS_CLIENT_ID='client-id'",
        "GOOGLE_ADS_CLIENT_SECRET=plain-secret",
        "export GOOGLE_ADS_REFRESH_TOKEN=refresh-token",
        "   export GOOGLE_ADS_LOGIN_CUSTOMER_ID = 7599028409 ",
        "NOT_A_PAIR",
        "EMPTY="
      ].join("\n")
    );
    expect(parsed).toMatchObject({
      GOOGLE_ADS_DEVELOPER_TOKEN: "dev-token",
      GOOGLE_ADS_CLIENT_ID: "client-id",
      GOOGLE_ADS_CLIENT_SECRET: "plain-secret",
      GOOGLE_ADS_REFRESH_TOKEN: "refresh-token",
      GOOGLE_ADS_LOGIN_CUSTOMER_ID: "7599028409",
      EMPTY: ""
    });
    expect(parsed.NOT_A_PAIR).toBeUndefined();
  });

  it("leaves unmatched quotes alone and tolerates an empty file", () => {
    expect(parseEnvFile('A="unclosed').A).toBe('"unclosed');
    expect(parseEnvFile("")).toEqual({});
  });
});

describe("pickGeoConstant", () => {
  const suggestions = [
    {
      geoTargetConstant: {
        resourceName: "geoTargetConstants/1014895",
        name: "Cobb County",
        canonicalName: "Cobb County,Georgia,United States",
        targetType: "County"
      }
    },
    {
      geoTargetConstant: {
        resourceName: "geoTargetConstants/1015116",
        name: "Marietta",
        canonicalName: "Marietta,Georgia,United States",
        targetType: "City"
      }
    },
    {
      geoTargetConstant: {
        resourceName: "geoTargetConstants/2840",
        name: "United States",
        canonicalName: "United States",
        targetType: "Country"
      }
    }
  ];

  it("selects the County constant for a '… County, GA' name", () => {
    expect(pickGeoConstant("Cobb County, GA", suggestions).resourceName).toBe(
      "geoTargetConstants/1014895"
    );
  });

  it("selects the Country constant for 'United States'", () => {
    expect(pickGeoConstant("United States", suggestions).resourceName).toBe(
      "geoTargetConstants/2840"
    );
  });

  it("prefers the exactly-named constant of the right type", () => {
    const withDecoy = [
      {
        geoTargetConstant: {
          resourceName: "geoTargetConstants/9999",
          name: "Cobb County Water System",
          targetType: "County"
        }
      },
      ...suggestions
    ];
    expect(pickGeoConstant("Cobb County, GA", withDecoy).resourceName).toBe(
      "geoTargetConstants/1014895"
    );
  });

  it("throws, listing the candidates, when no constant has the wanted type", () => {
    const cityOnly = [suggestions[1]];
    expect(() => pickGeoConstant("Douglas County, GA", cityOnly)).toThrow(
      /No County geo target found for "Douglas County, GA"\. Candidates: Marietta \(City\)/
    );
  });

  it("throws when nothing came back at all", () => {
    expect(() => pickGeoConstant("United States", [])).toThrow(/\(none returned\)/);
  });
});

describe("parseArgs", () => {
  it("applies the documented defaults and derives --json from --out", () => {
    const opts = parseArgs(["--terms", "t.md", "--out", "d.md"]);
    expect(opts).toMatchObject({
      terms: "t.md",
      out: "d.md",
      json: "d.md.json",
      env: ".env.local",
      localGeo: "Cobb County, GA;Douglas County, GA",
      nationalGeo: "United States",
      dryRun: false
    });
  });

  it("accepts overrides and --dry-run", () => {
    const opts = parseArgs([
      "--terms",
      "t.md",
      "--out",
      "d.md",
      "--json",
      "raw.json",
      "--env",
      "/nonexistent",
      "--local-geo",
      "Cobb County, GA",
      "--national-geo",
      "United States",
      "--dry-run"
    ]);
    expect(opts.json).toBe("raw.json");
    expect(opts.env).toBe("/nonexistent");
    expect(opts.localGeo).toBe("Cobb County, GA");
    expect(opts.dryRun).toBe(true);
  });

  it("requires --terms and --out", () => {
    expect(() => parseArgs(["--out", "d.md"])).toThrow(/--terms/);
    expect(() => parseArgs(["--terms", "t.md"])).toThrow(/--out/);
    expect(() => parseArgs(["--bogus", "x"])).toThrow(/Unknown argument/);
    expect(() => parseArgs(["--terms", "--out"])).toThrow(/requires a value/);
  });
});

describe("describeApiError", () => {
  it("prints Google's message and the first errorCode verbatim", () => {
    const out = describeApiError(
      400,
      {
        error: {
          message: "Request contains an invalid argument.",
          details: [
            { errors: [{ errorCode: { keywordPlanIdeaError: "URL_CRAWL_ERROR" } }] }
          ]
        }
      },
      ""
    );
    expect(out).toContain("Request contains an invalid argument.");
    expect(out).toContain('{"keywordPlanIdeaError":"URL_CRAWL_ERROR"}');
    expect(out).not.toContain("Hint:");
  });

  it("adds the manager-account hint when the error mentions a manager account", () => {
    const out = describeApiError(
      403,
      {
        error: {
          message: "The operation is not allowed for the given account.",
          details: [
            {
              errors: [
                {
                  errorCode: {
                    requestError: "REQUEST_NOT_SUPPORTED_FOR_MANAGER_ACCOUNT"
                  }
                }
              ]
            }
          ]
        }
      },
      ""
    );
    expect(out).toContain(
      "Hint: Set GOOGLE_ADS_CUSTOMER_ID to a client account id under MCC 7599028409 (digits only)."
    );
  });

  it("falls back to the raw body when there is no structured error", () => {
    expect(describeApiError(500, null, "upstream boom")).toContain("upstream boom");
  });
});

describe("titleFromTermsPath", () => {
  it("uses the containing directory for a generic demand-terms.md", () => {
    expect(
      titleFromTermsPath("/x/code/proposals/garlandservices.net/demand-terms.md")
    ).toBe("garlandservices.net");
  });

  it("uses the file stem when it is specific", () => {
    expect(titleFromTermsPath("/x/pest-control-terms.md")).toBe("pest-control-terms");
  });
});
