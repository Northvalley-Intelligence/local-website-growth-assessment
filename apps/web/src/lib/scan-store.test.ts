import {
  type AssessmentJob,
  crawlerPolicy,
  type AssessmentReport
} from "@northvalleyintel/assessment-shared";
import { beforeEach, describe, expect, it } from "vitest";
import {
  clearScansForTest,
  completeAssessmentJob,
  createAssessmentJob,
  failAssessmentJob,
  getAssessmentJob,
  listScans,
  markAssessmentInsufficientEvidence,
  markAssessmentRunning,
  saveScan
} from "./scan-store";

function report(index: number): AssessmentReport {
  return {
    id: `scan-${index}`,
    url: `https://example-${index}.com/`,
    domain: `example-${index}.com`,
    grade: "C",
    overallScore: 70,
    executiveSummary: "Summary",
    categories: [],
    topBusinessProblems: [],
    topRecommendedFixes: [],
    revenueLeakageExplanation: "Explanation",
    neighborReferralScore: 7,
    disclaimer:
      "This is an automated public website assessment, not a legal, SEO, accessibility, or security compliance certification.",
    evidenceQuality: {
      assessmentStatus: "successful",
      confidence: "high",
      pagesWithReadableText: 1,
      meaningfulPages: 1,
      totalTextCharacters: 1200,
      summary: "Enough public website evidence was collected.",
      limitations: []
    },
    crawlMetadata: {
      startedUrl: `https://example-${index}.com/`,
      durationMs: 10,
      pagesCrawled: 1,
      maxPages: crawlerPolicy.maxPages,
      maxDepth: crawlerPolicy.maxDepth,
      requestTimeoutMs: crawlerPolicy.requestTimeoutMs,
      maxResponseBytes: crawlerPolicy.maxResponseBytes,
      maxConcurrency: crawlerPolicy.maxConcurrency,
      robotsTxtFound: false,
      robotsTxtUrl: `https://example-${index}.com/robots.txt`,
      skippedUrls: [],
      decisions: [],
      adapterFailures: [],
      pagespeed: {
        status: "skipped",
        explanation: "Skipped"
      }
    },
    createdAt: new Date(2026, 5, 5, 12, 0, index).toISOString()
  };
}

describe("scan store", () => {
  beforeEach(async () => {
    await clearScansForTest();
  });

  it("keeps in-memory scan history bounded", async () => {
    for (let index = 0; index < crawlerPolicy.maxScanHistory + 5; index += 1) {
      await saveScan(report(index));
    }

    const scans = await listScans();

    expect(scans).toHaveLength(crawlerPolicy.maxScanHistory);
    expect(scans.some((scan) => scan.id === "scan-0")).toBe(false);
    expect(scans[0]?.id).toBe(`scan-${crawlerPolicy.maxScanHistory + 4}`);
  });

  it("tracks asynchronous assessment status transitions", async () => {
    const job = await createAssessmentJob({
      id: "async-1",
      url: "https://example.com/",
      domain: "example.com",
      now: new Date("2026-06-05T12:00:00.000Z")
    });

    expect(job.status).toBe("pending");
    expect((await getAssessmentJob(job.id))?.report).toBeUndefined();

    expect((await markAssessmentRunning(job.id))?.status).toBe("running");
    expect((await completeAssessmentJob(job.id, report(1)))?.status).toBe("completed");
    expect((await getAssessmentJob(job.id))?.report?.id).toBe("scan-1");
  });

  it("tracks failed asynchronous assessment status without creating a report", async () => {
    const job: AssessmentJob = await createAssessmentJob({
      id: "async-failed",
      url: "https://example.com/",
      domain: "example.com"
    });

    expect((await failAssessmentJob(job.id, "crawl failed"))?.status).toBe("failed");
    expect((await getAssessmentJob(job.id))?.error).toBe("crawl failed");
    expect((await getAssessmentJob(job.id))?.report).toBeUndefined();
  });

  it("tracks insufficient evidence without creating a completed report", async () => {
    const job: AssessmentJob = await createAssessmentJob({
      id: "async-insufficient",
      url: "https://example.com/",
      domain: "example.com"
    });

    expect(
      (
        await markAssessmentInsufficientEvidence(
          job.id,
          "No public HTML pages were crawled."
        )
      )?.status
    ).toBe("insufficient_evidence");
    expect((await getAssessmentJob(job.id))?.error).toContain("No public HTML pages");
    expect((await getAssessmentJob(job.id))?.report).toBeUndefined();
  });
});
