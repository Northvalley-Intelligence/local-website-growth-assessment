import {
  crawlerPolicy,
  scoringWeights,
  type AssessmentJob,
  type CategoryScoreFactor,
  type CategoryAssessment,
  type AssessmentReport,
  type AssessmentStatus
} from "@northvalleyintel/assessment-shared";
import { getCloudflareContext } from "@opennextjs/cloudflare";

type D1DatabaseBinding = {
  exec(sql: string): Promise<unknown>;
  prepare(sql: string): {
    run(): Promise<unknown>;
    bind(...values: unknown[]): {
      run(): Promise<unknown>;
      first<T = unknown>(): Promise<T | null>;
      all<T = unknown>(): Promise<{ results?: T[] }>;
    };
    first<T = unknown>(): Promise<T | null>;
    all<T = unknown>(): Promise<{ results?: T[] }>;
  };
};

type AssessmentCloudflareEnv = {
  ASSESSMENT_DB?: D1DatabaseBinding;
};

type StoredJobRow = {
  job_json: string;
};

const jobs = new Map<string, AssessmentJob>();
let d1SchemaReady: Promise<void> | null = null;

export async function createAssessmentJob(input: {
  id: string;
  url: string;
  domain: string;
  now?: Date;
}): Promise<AssessmentJob> {
  const timestamp = (input.now ?? new Date()).toISOString();
  const job: AssessmentJob = {
    id: input.id,
    url: input.url,
    domain: input.domain,
    status: "pending",
    createdAt: timestamp,
    updatedAt: timestamp
  };
  await storeJob(job);
  return job;
}

export async function markAssessmentRunning(
  id: string,
  now = new Date()
): Promise<AssessmentJob | null> {
  return await updateAssessmentJob(id, {
    status: "running",
    startedAt: now.toISOString(),
    updatedAt: now.toISOString()
  });
}

export async function completeAssessmentJob(
  id: string,
  report: AssessmentReport,
  now = new Date()
): Promise<AssessmentJob | null> {
  return await updateAssessmentJob(id, {
    status: "completed",
    report: normalizeReport(report),
    completedAt: now.toISOString(),
    updatedAt: now.toISOString()
  });
}

export async function failAssessmentJob(
  id: string,
  error: string,
  now = new Date()
): Promise<AssessmentJob | null> {
  return await updateAssessmentJob(id, {
    status: "failed",
    error,
    failedAt: now.toISOString(),
    updatedAt: now.toISOString()
  });
}

export async function markAssessmentInsufficientEvidence(
  id: string,
  error: string,
  now = new Date()
): Promise<AssessmentJob | null> {
  return await updateAssessmentJob(id, {
    status: "insufficient_evidence",
    error,
    failedAt: now.toISOString(),
    updatedAt: now.toISOString()
  });
}

export async function getAssessmentJob(id: string): Promise<AssessmentJob | null> {
  const d1 = getAssessmentD1();
  if (d1) {
    await ensureD1Schema(d1);
    const row = await d1
      .prepare("SELECT job_json FROM assessment_jobs WHERE id = ?")
      .bind(id)
      .first<StoredJobRow>();
    return row ? normalizeStoredItem(JSON.parse(row.job_json)) : null;
  }

  await loadJobsFromDisk();
  return jobs.get(id) ?? null;
}

export async function getScan(id: string): Promise<AssessmentReport | null> {
  return (await getAssessmentJob(id))?.report ?? null;
}

export async function listAssessmentJobs(): Promise<AssessmentJob[]> {
  const d1 = getAssessmentD1();
  if (d1) {
    await ensureD1Schema(d1);
    const rows = await d1
      .prepare("SELECT job_json FROM assessment_jobs ORDER BY created_at DESC LIMIT ?")
      .bind(crawlerPolicy.maxScanHistory)
      .all<StoredJobRow>();
    return (rows.results ?? []).map((row) =>
      normalizeStoredItem(JSON.parse(row.job_json))
    );
  }

  await loadJobsFromDisk();
  return sortedJobs();
}

export async function listScans(): Promise<AssessmentReport[]> {
  return (await listAssessmentJobs())
    .map((job) => job.report)
    .filter((report): report is AssessmentReport => Boolean(report));
}

export async function saveScan(report: AssessmentReport): Promise<AssessmentReport> {
  await storeJob({
    id: report.id,
    url: report.url,
    domain: report.domain,
    status: "completed",
    createdAt: report.createdAt,
    updatedAt: report.createdAt,
    startedAt: report.createdAt,
    completedAt: report.createdAt,
    report: normalizeReport(report)
  });
  return report;
}

export async function clearScansForTest(): Promise<void> {
  if (process.env.NODE_ENV !== "test") return;
  jobs.clear();
  const fs = await import("node:fs");
  const path = scanStorePath();
  if (fs.existsSync(path)) fs.unlinkSync(path);
}

export function assessmentStatusLabel(status: AssessmentStatus): string {
  const labels: Record<AssessmentStatus, string> = {
    pending: "Pending",
    running: "Running",
    completed: "Completed",
    failed: "Failed",
    insufficient_evidence: "Insufficient evidence"
  };
  return labels[status];
}

async function updateAssessmentJob(
  id: string,
  patch: Partial<AssessmentJob>
): Promise<AssessmentJob | null> {
  const current = await getAssessmentJob(id);
  if (!current) return null;
  const next = { ...current, ...patch };
  await storeJob(next);
  return next;
}

async function storeJob(job: AssessmentJob): Promise<void> {
  const d1 = getAssessmentD1();
  if (d1) {
    await ensureD1Schema(d1);
    await d1
      .prepare(
        "INSERT OR REPLACE INTO assessment_jobs (id, created_at, updated_at, job_json) VALUES (?, ?, ?, ?)"
      )
      .bind(job.id, job.createdAt, job.updatedAt, JSON.stringify(job))
      .run();
    await trimD1JobHistory(d1);
    return;
  }

  await loadJobsFromDisk();
  jobs.set(job.id, job);
  trimLocalJobHistory();
  await persistJobsToDisk();
}

function trimLocalJobHistory(): void {
  const stale = sortedJobs().slice(crawlerPolicy.maxScanHistory);

  for (const job of stale) {
    jobs.delete(job.id);
  }
}

async function trimD1JobHistory(d1: D1DatabaseBinding): Promise<void> {
  await d1
    .prepare(
      "DELETE FROM assessment_jobs WHERE id NOT IN (SELECT id FROM assessment_jobs ORDER BY created_at DESC LIMIT ?)"
    )
    .bind(crawlerPolicy.maxScanHistory)
    .run();
}

async function loadJobsFromDisk(): Promise<void> {
  const fs = await import("node:fs");
  const path = scanStorePath();
  if (!fs.existsSync(path)) return;

  const loaded = JSON.parse(fs.readFileSync(path, "utf8")) as Array<
    AssessmentJob | AssessmentReport
  >;
  jobs.clear();
  for (const item of loaded) {
    const job = normalizeStoredItem(item);
    jobs.set(job.id, job);
  }
}

async function persistJobsToDisk(): Promise<void> {
  const fs = await import("node:fs");
  const pathModule = await import("node:path");
  const path = scanStorePath();
  fs.mkdirSync(pathModule.dirname(path), { recursive: true });
  fs.writeFileSync(path, JSON.stringify(sortedJobs(), null, 2));
}

function scanStorePath(): string {
  const fallbackPath = `${process.cwd()}/.next/assessment-scans.json`;
  return process.env.ASSESSMENT_SCAN_STORE_PATH ?? fallbackPath;
}

function sortedJobs(): AssessmentJob[] {
  return [...jobs.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

function getAssessmentD1(): D1DatabaseBinding | null {
  if (process.env.NODE_ENV === "test") return null;

  try {
    const env = getCloudflareContext().env as AssessmentCloudflareEnv;
    return env.ASSESSMENT_DB ?? null;
  } catch {
    return null;
  }
}

async function ensureD1Schema(d1: D1DatabaseBinding): Promise<void> {
  d1SchemaReady ??= (async () => {
    await d1
      .prepare(
        "CREATE TABLE IF NOT EXISTS assessment_jobs (id TEXT PRIMARY KEY, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, job_json TEXT NOT NULL)"
      )
      .run();
    await d1
      .prepare(
        "CREATE INDEX IF NOT EXISTS idx_assessment_jobs_created_at ON assessment_jobs (created_at DESC)"
      )
      .run();
  })();
  await d1SchemaReady;
}

function normalizeStoredItem(item: AssessmentJob | AssessmentReport): AssessmentJob {
  if ("status" in item) return item;

  return {
    id: item.id,
    url: item.url,
    domain: item.domain,
    status: "completed",
    createdAt: item.createdAt,
    updatedAt: item.createdAt,
    startedAt: item.createdAt,
    completedAt: item.createdAt,
    report: normalizeReport(item)
  };
}

function normalizeReport(report: AssessmentReport): AssessmentReport {
  return {
    ...report,
    evidenceQuality: report.evidenceQuality ?? {
      assessmentStatus:
        report.crawlMetadata.pagesCrawled > 1 ? "successful" : "partial",
      confidence: report.crawlMetadata.pagesCrawled > 1 ? "medium" : "low",
      pagesWithReadableText: report.crawlMetadata.pagesCrawled,
      meaningfulPages: report.crawlMetadata.pagesCrawled,
      totalTextCharacters: 0,
      summary:
        "This older locally stored report was created before evidence quality metadata was added.",
      limitations: [
        "Evidence sufficiency details are unavailable for this older local report."
      ]
    },
    categories: report.categories.map(normalizeCategory)
  };
}

function normalizeCategory(category: CategoryAssessment): CategoryAssessment {
  if (category.scoreExplanation && category.factors) {
    return {
      ...category,
      factors: category.factors.map(normalizeFactor)
    };
  }

  const foundFactors = category.evidenceFound.map((evidence) => ({
    label: evidence,
    passed: true,
    evidence,
    evidenceDetails: [
      "This locally stored result was created before detailed evidence tracing was added."
    ],
    check: evidence,
    businessExplanation: evidence,
    existingContentNote:
      "This locally stored result was created before existing-content comparison notes were added.",
    recommendedAction: "Keep this signal visible and easy to verify.",
    scoreImpact: Math.round(
      100 / Math.max(1, category.evidenceFound.length + category.evidenceMissing.length)
    )
  }));
  const missingFactors = category.evidenceMissing.map((evidence) => ({
    label: evidence,
    passed: false,
    evidence,
    evidenceDetails: [
      "This locally stored result was created before detailed evidence tracing was added."
    ],
    check: evidence,
    businessExplanation: evidence,
    existingContentNote:
      "This locally stored result was created before existing-content comparison notes were added.",
    recommendedAction:
      "Review this missing signal and add it where it supports the business goal.",
    scoreImpact: Math.round(
      100 / Math.max(1, category.evidenceFound.length + category.evidenceMissing.length)
    )
  }));
  const totalFactors = foundFactors.length + missingFactors.length;
  const weight = scoringWeights[category.category];
  const weightedContribution = Math.round((category.score * weight) / 100);

  return {
    ...category,
    weight,
    scoreStatus: category.scoreStatus ?? "scored",
    factors: [...foundFactors, ...missingFactors],
    scoreExplanation: {
      formula: `${foundFactors.length} of ${totalFactors} factors passed = ${category.score}/100. Category weight: ${weight}%. Weighted contribution: ${weightedContribution} points.`,
      passedFactors: foundFactors.length,
      totalFactors,
      weightedContribution,
      confidence: totalFactors > 0 ? "medium" : "low",
      summary: `${category.label} scored ${category.score}/100 because ${foundFactors.length} of ${totalFactors} evidence checks passed.`
    }
  };
}

function normalizeFactor(
  factor: Partial<CategoryScoreFactor> & {
    label: string;
    passed: boolean;
    evidence: string;
    scoreImpact: number;
  }
): CategoryScoreFactor {
  return {
    ...factor,
    check: factor.check ?? factor.label,
    evidenceDetails: factor.evidenceDetails ?? [
      "This locally stored result was created before detailed evidence tracing was added."
    ],
    businessExplanation: factor.businessExplanation ?? factor.evidence,
    existingContentNote:
      factor.existingContentNote ??
      "This locally stored result was created before existing-content comparison notes were added.",
    recommendedAction:
      factor.recommendedAction ??
      (factor.passed
        ? "Keep this signal visible and easy to verify."
        : "Review this missing signal and add it where it supports the business goal.")
  };
}
