import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("customer-facing report structure", () => {
  it("orders decision-oriented sections before detailed diagnostics", () => {
    const source = readFileSync(
      join(process.cwd(), "apps/web/src/app/reports/[id]/page.tsx"),
      "utf8"
    );

    const expectedOrder = [
      "Executive Summary",
      "Biggest Opportunity",
      "Fix These First",
      "Does The Website Match What People Search For?",
      "Where The Website Stands",
      "Why These Actions Matter",
      "What We Checked",
      "Review The Details"
    ];
    const positions = expectedOrder.map((label) => source.indexOf(label));

    expect(positions.every((position) => position >= 0)).toBe(true);
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
  });

  it("keeps score explanations in expandable detailed findings", () => {
    const source = readFileSync(
      join(process.cwd(), "apps/web/src/app/reports/[id]/page.tsx"),
      "utf8"
    );

    expect(source).toContain("<details");
    expect(source).toContain("How this score was calculated");
    expect(source).toContain("scoreExplanation.formula");
    expect(source).toContain("scoreExplanation.passedFactors");
    expect(source).toContain("Existing content vs recommended signal");
    expect(source).toContain("factor.businessExplanation");
    expect(source).toContain("factor.recommendedAction");
    expect(source.indexOf("Fix These First")).toBeLessThan(
      source.indexOf("How this score was calculated")
    );
  });

  it("establishes trust by showing found evidence before missing items and recommendations", () => {
    const source = readFileSync(
      join(process.cwd(), "apps/web/src/app/reports/[id]/page.tsx"),
      "utf8"
    );

    expect(source).toContain("What We Found");
    expect(source).toContain("What Still Needs Attention");
    expect(source).toContain("What Is Missing");
    expect(source).toContain("Machine-Readable Or Verifiable Signals");
    expect(source).toContain("Recommendation");

    expect(source.indexOf("What We Found")).toBeLessThan(
      source.indexOf("What Still Needs Attention")
    );
    expect(source.indexOf("What Is Missing")).toBeLessThan(
      source.indexOf("Recommendation")
    );
    expect(source.indexOf("Recommendation")).toBeLessThan(
      source.indexOf("How this score was calculated")
    );
  });

  it("renders evidence details next to negative findings", () => {
    const source = readFileSync(
      join(process.cwd(), "apps/web/src/app/reports/[id]/page.tsx"),
      "utf8"
    );

    expect(source).toContain("Evidence reviewed:");
    expect(source).toContain("factor.evidenceDetails");
    expect(source).toContain("evidence-detail-list");
    expect(source.indexOf("Evidence reviewed:")).toBeLessThan(
      source.indexOf("Existing content vs recommended signal")
    );
  });

  it("shows demand satisfaction with found evidence before demand gaps", () => {
    const source = readFileSync(
      join(process.cwd(), "apps/web/src/app/reports/[id]/page.tsx"),
      "utf8"
    );

    expect(source).toContain("Customer Demand Fit");
    expect(source).toContain("report.demandSatisfaction.summary");
    expect(source).toContain("Demand Gaps To Review");
    expect(source).toContain("Demand opportunities with evidence");
    expect(source).toContain("opportunity.pagesChecked");
    expect(source.indexOf("What We Found")).toBeLessThan(
      source.indexOf("Demand Gaps To Review")
    );
  });
});
