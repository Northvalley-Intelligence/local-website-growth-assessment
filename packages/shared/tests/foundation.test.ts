import { describe, expect, it } from "vitest";
import {
  categoryWeightTotal,
  crawlerPolicy,
  disclaimer,
  scoringWeights,
  validateAssessmentUrl
} from "../src/index";

describe("Phase 0 shared foundation", () => {
  it("defines the required scoring weights", () => {
    expect(scoringWeights).toEqual({
      localVisibility: 20,
      leadConversion: 20,
      trustSignals: 15,
      messageClarity: 15,
      mobileExperience: 10,
      aiDiscoverability: 10,
      performance: 5,
      securityReliability: 5
    });
    expect(categoryWeightTotal()).toBe(100);
  });

  it("defines the required crawler safety policy", () => {
    expect(crawlerPolicy).toEqual({
      userAgent: "NorthValleyIntelWebsiteAssessmentBot/0.1",
      maxPages: 25,
      maxDepth: 2,
      crawlDelayMs: 1000,
      requestTimeoutMs: 10000,
      pageSpeedTimeoutMs: 45000,
      maxResponseBytes: 750000,
      maxConcurrency: 1,
      maxScanHistory: 50
    });
  });

  it("validates safe public assessment URLs", () => {
    expect(validateAssessmentUrl("https://example.com/service").hostname).toBe(
      "example.com"
    );
    expect(validateAssessmentUrl("medinaclean.com").href).toBe(
      "https://medinaclean.com/"
    );
    expect(validateAssessmentUrl("www.medinaclean.com").href).toBe(
      "https://www.medinaclean.com/"
    );
    expect(validateAssessmentUrl("https://medinaclean.com").href).toBe(
      "https://medinaclean.com/"
    );
    expect(() => validateAssessmentUrl("ftp://example.com")).toThrow();
    expect(() => validateAssessmentUrl("file:///etc/passwd")).toThrow();
    expect(() => validateAssessmentUrl("javascript:alert(1)")).toThrow();
    expect(() => validateAssessmentUrl("data:text/html,hello")).toThrow();
    expect(() => validateAssessmentUrl("https://user:pass@example.com")).toThrow();
    expect(() => validateAssessmentUrl("http://localhost:3000")).toThrow();
    expect(() => validateAssessmentUrl("localhost:3000")).toThrow();
    expect(() => validateAssessmentUrl("http://192.168.1.10")).toThrow();
    expect(() => validateAssessmentUrl("192.168.1.10")).toThrow();
    expect(() => validateAssessmentUrl("not-a-url")).toThrow();
    expect(() => validateAssessmentUrl("medinaclean")).toThrow();
    expect(() => validateAssessmentUrl("medina clean.com")).toThrow();
  });

  it("keeps the required disclaimer available for reports", () => {
    expect(disclaimer).toContain("automated public website assessment");
    expect(disclaimer).toContain("not a legal, SEO, accessibility, or security");
  });
});
