import {
  assessWebsite,
  googlePageSpeedAdapter,
  InsufficientEvidenceError
} from "@northvalleyintel/assessment-worker";
import { validateAssessmentUrl } from "@northvalleyintel/assessment-shared";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import {
  completeAssessmentJob,
  createAssessmentJob,
  failAssessmentJob,
  markAssessmentInsufficientEvidence,
  listAssessmentJobs,
  markAssessmentRunning
} from "../../../lib/scan-store";

const runningJobs = new Set<string>();
const cloudflareExecutionTimeoutMs = 25000;
const cloudflarePageSpeedTimeoutMs = 5000;

type CloudflareRuntimeContext = {
  ctx: { waitUntil(promise: Promise<unknown>): void };
  env?: { PAGESPEED_API_KEY?: string };
};

export async function GET() {
  return NextResponse.json({ scans: await listAssessmentJobs() });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { url?: unknown };
    const submittedUrl = typeof body.url === "string" ? body.url : "";
    const url = validateAssessmentUrl(submittedUrl);
    const createdAt = new Date();
    const scanId = stableScanId(url.hostname, createdAt);
    const job = await createAssessmentJob({
      id: scanId,
      url: url.href,
      domain: url.hostname,
      now: createdAt
    });

    queueAssessment(job.id, job.url, createdAt);

    return NextResponse.json(
      {
        scanId: job.id,
        status: job.status,
        statusUrl: `/api/scans/${job.id}`,
        reportUrl: `/reports/${job.id}`
      },
      { status: 202 }
    );
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          error:
            "Please enter a public business website, like example.com or https://example.com."
        },
        { status: 400 }
      );
    }

    console.error("Assessment queue failure", {
      message: error instanceof Error ? error.message : "unknown error",
      name: error instanceof Error ? error.name : "UnknownError"
    });

    return NextResponse.json(
      {
        error: "The assessment could not be queued. Please check the URL and try again."
      },
      { status: 500 }
    );
  }
}

function queueAssessment(id: string, url: string, createdAt: Date): void {
  if (runningJobs.has(id)) return;
  runningJobs.add(id);

  const work = runAssessment(id, url, createdAt);
  const cloudflareContext = getOptionalCloudflareContext();

  if (cloudflareContext) {
    cloudflareContext.ctx.waitUntil(work);
    return;
  }

  setTimeout(() => {
    void work;
  }, 0);
}

async function runAssessment(id: string, url: string, createdAt: Date): Promise<void> {
  await markAssessmentRunning(id);
  try {
    const cloudflareContext = getOptionalCloudflareContext();
    const pagespeedApiKey =
      process.env.PAGESPEED_API_KEY ||
      cloudflareContext?.env?.PAGESPEED_API_KEY ||
      undefined;
    const assessment = assessWebsite(
      { url },
      {
        pagespeedApiKey,
        pageSpeedAdapter: pagespeedApiKey ? googlePageSpeedAdapter : undefined,
        pageSpeedTimeoutMs: cloudflareContext
          ? cloudflarePageSpeedTimeoutMs
          : undefined,
        now: () => createdAt
      }
    );
    const report = cloudflareContext
      ? await withTimeout(
          assessment,
          cloudflareExecutionTimeoutMs,
          "The assessment took too long to complete in the staging runtime. Please try again or use a smaller public site while we move long-running scans to dedicated background execution."
        )
      : await assessment;
    await completeAssessmentJob(id, report);
  } catch (error) {
    if (error instanceof InsufficientEvidenceError) {
      await markAssessmentInsufficientEvidence(id, error.message);
      return;
    }

    await failAssessmentJob(
      id,
      error instanceof Error ? error.message : "Assessment failed unexpectedly."
    );
  } finally {
    runningJobs.delete(id);
  }
}

function stableScanId(domain: string, createdAt: Date): string {
  return `${domain.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-${createdAt.getTime()}`;
}

function getOptionalCloudflareContext(): CloudflareRuntimeContext | null {
  try {
    return getCloudflareContext() as CloudflareRuntimeContext;
  } catch {
    return null;
  }
}

async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  message: string
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;

  try {
    return await Promise.race([
      promise,
      new Promise<never>((_resolve, reject) => {
        timer = setTimeout(() => reject(new Error(message)), timeoutMs);
      })
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}
