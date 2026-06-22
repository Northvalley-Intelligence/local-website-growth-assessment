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

  it("assesses welding demand from the synced demand dataset", () => {
    const report = assessDemandSatisfaction({
      websiteEvidence: {
        pages: [
          {
            url: "https://welder.example/",
            title: "Mobile Welding and Metal Fabrication in Marietta",
            text: "We provide mobile welding, metal fabrication, aluminum welding, trailer repair, gate repair, emergency welding repair, estimates, and commercial welding for local customers."
          }
        ]
      }
    });

    expect(report.status).toBe("assessed");
    expect(report.sector).toBe("welding");
    expect(report.sectorLabel).toBe("Welding");
    expect(report.demandRecordsEvaluated).toBeGreaterThanOrEqual(60);
    expect(report.score).not.toBeNull();
    expect(report.records.some((record) => record.monthlySearches !== null)).toBe(true);
  });

  it("assesses senior living demand from the synced demand dataset", () => {
    const report = assessDemandSatisfaction({
      websiteEvidence: {
        pages: [
          {
            url: "https://seniorliving.example/",
            title: "Assisted Living and Memory Care in Marietta",
            text: "Our senior living community provides assisted living, memory care, independent living, respite care, senior apartments, nursing support, tours, pricing guidance, and Medicaid planning for families."
          }
        ]
      }
    });

    expect(report.status).toBe("assessed");
    expect(report.sector).toBe("senior_living");
    expect(report.sectorLabel).toBe("Senior Living");
    expect(report.demandRecordsEvaluated).toBeGreaterThanOrEqual(60);
    expect(report.score).not.toBeNull();
    expect(report.records.some((record) => record.monthlySearches !== null)).toBe(true);
    expect(
      report.opportunities.some((opportunity) => opportunity.monthlySearches !== null)
    ).toBe(true);
  });

  it("carries synced real estate Keyword Planner counts into demand records", () => {
    const report = assessDemandSatisfaction({
      websiteEvidence: {
        pages: [
          {
            url: "https://realestate.example/",
            title: "Marietta Real Estate Agent",
            text: "We help buyers find homes for sale, help owners sell your home, provide home value guidance, relocation support, neighborhood guides, and listing agent services."
          }
        ]
      }
    });

    expect(report.status).toBe("assessed");
    expect(report.sector).toBe("real_estate");
    expect(report.sectorLabel).toBe("Real Estate");
    expect(report.demandRecordsEvaluated).toBeGreaterThanOrEqual(290);
    expect(report.records.some((record) => record.monthlySearches !== null)).toBe(true);
  });

  it("carries expanded cleaning city Keyword Planner counts into demand records", () => {
    const report = assessDemandSatisfaction({
      websiteEvidence: {
        pages: [
          {
            url: "https://cleaner.example/",
            title: "Marietta House Cleaning and Maid Service",
            text: "We provide house cleaning, maid service, deep cleaning, move out cleaning, office cleaning, apartment cleaning, recurring cleaning, estimates, and reviews across Marietta and Smyrna."
          }
        ]
      }
    });

    expect(report.status).toBe("assessed");
    expect(report.sector).toBe("cleaning");
    expect(report.sectorLabel).toBe("Cleaning");
    expect(report.demandRecordsEvaluated).toBeGreaterThanOrEqual(177);
    expect(report.records.some((record) => record.monthlySearches !== null)).toBe(true);
  });

  it("assesses restoration and remediation demand from the synced demand dataset", () => {
    const report = assessDemandSatisfaction({
      websiteEvidence: {
        pages: [
          {
            url: "https://restoration.example/",
            title: "Marietta Water Damage Restoration and Mold Remediation",
            text: "We provide emergency water removal, water damage restoration, fire damage restoration, smoke damage cleanup, mold remediation, crawl space moisture control, storm damage cleanup, insurance claim support, estimates, and certified restoration service in Marietta."
          }
        ]
      }
    });

    expect(report.status).toBe("assessed");
    expect(report.sector).toBe("restoration_remediation");
    expect(report.sectorLabel).toBe("Restoration & Remediation");
    expect(report.demandRecordsEvaluated).toBeGreaterThanOrEqual(238);
    expect(report.records.some((record) => record.monthlySearches !== null)).toBe(true);
  });

  it("assesses AI solutions demand from the synced demand dataset", () => {
    const report = assessDemandSatisfaction({
      websiteEvidence: {
        pages: [
          {
            url: "https://ai.example/",
            title: "Marietta AI Consulting and Automation Agency",
            text: "We provide AI consulting, custom AI solutions, AI implementation, AI automation, workflow automation, CRM automation, sales automation, AI chatbot development, customer service automation, AI agents, AI training for business, ChatGPT consulting, estimates, and case studies for local businesses."
          }
        ]
      }
    });

    expect(report.status).toBe("assessed");
    expect(report.sector).toBe("ai_solutions");
    expect(report.sectorLabel).toBe("AI Solutions");
    expect(report.demandRecordsEvaluated).toBeGreaterThanOrEqual(269);
    expect(report.score).not.toBeNull();
    expect(report.records.some((record) => record.monthlySearches !== null)).toBe(true);
  });

  it("carries monthly search counts into demand opportunities when available", () => {
    const report = assessDemandSatisfaction({
      websiteEvidence: {
        pages: [
          {
            url: "https://welder.example/",
            title: "Mobile Welding",
            text: "Mobile welding and emergency welding repair for local customers."
          }
        ]
      },
      demandRecords: [
        {
          id: "welding-cost-priced-opportunity",
          sector: "welding",
          subcategory: "cost",
          keyword: "mobile welding near me prices",
          normalized_keyword: "mobile welding near me prices",
          intent: "Cost / Pricing",
          priority: "high",
          location_modifier: "near me",
          monthly_searches: 70,
          search_volume_source: "keyword_planner",
          active: true
        },
        {
          id: "welding-cost-legacy-null-volume",
          sector: "welding",
          subcategory: "cost",
          keyword: "cheap mobile welders near me prices",
          normalized_keyword: "cheap mobile welders near me prices",
          intent: "Cost / Pricing",
          priority: "high",
          location_modifier: "near me",
          monthly_searches: null,
          search_volume_source: "unknown",
          active: true
        }
      ]
    });

    expect(report.status).toBe("assessed");
    expect(report.opportunities).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          keyword: "mobile welding near me prices",
          monthlySearches: 70,
          searchVolumeSource: "keyword_planner"
        })
      ])
    );
  });
});
