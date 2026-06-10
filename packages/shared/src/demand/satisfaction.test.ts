import { describe, expect, it } from "vitest";
import { assessDemandSatisfaction } from "./satisfaction.js";

describe("demand satisfaction", () => {
  it("assesses a supported local-service sector from crawled website evidence", () => {
    const report = assessDemandSatisfaction({
      websiteEvidence: {
        pages: [
          {
            url: "https://cleaner.example/",
            title: "Medina House Cleaning",
            metaDescription: "Deep cleaning and recurring home cleaning services.",
            text: "We provide house cleaning, deep cleaning, move out cleaning, office cleaning, weekly cleaning, estimates, and reviews for local homeowners."
          }
        ]
      }
    });

    expect(report.status).toBe("assessed");
    expect(report.sector).toBe("cleaning");
    expect(report.score).not.toBeNull();
    expect(report.demandRecordsEvaluated).toBeGreaterThan(0);
    expect(report.foundSummary.length).toBeGreaterThan(0);
  });

  it("skips demand scoring when the website sector is not confidently supported", () => {
    const report = assessDemandSatisfaction({
      websiteEvidence: {
        pages: [
          {
            url: "https://restaurant.example/",
            title: "Neighborhood Cafe",
            text: "Breakfast, lunch, catering, menu, coffee, and patio seating."
          }
        ]
      }
    });

    expect(report.status).toBe("skipped");
    expect(report.score).toBeNull();
    expect(report.summary).toContain("could not be identified confidently");
  });

  it("keeps demand gaps traceable to pages checked and missing signals", () => {
    const report = assessDemandSatisfaction({
      websiteEvidence: {
        pages: [
          {
            url: "https://hvac.example/",
            title: "HVAC Repair",
            text: "Air conditioner repair, heating repair, HVAC maintenance, tune up, and system inspection for homeowners."
          }
        ]
      }
    });
    const opportunity = report.opportunities[0];

    expect(report.status).toBe("assessed");
    expect(opportunity).toBeDefined();
    expect(opportunity?.pagesChecked).toContain("https://hvac.example/");
    expect(
      (opportunity?.missingSignals.length ?? 0) > 0 ||
        (opportunity?.foundEvidence.length ?? 0) > 0
    ).toBe(true);
  });
});
