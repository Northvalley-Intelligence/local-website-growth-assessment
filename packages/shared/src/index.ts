import { isIP } from "node:net";
import { z } from "zod";

export const crawlerPolicy = {
  userAgent: "NorthValleyIntelWebsiteAssessmentBot/0.1",
  maxPages: 25,
  maxDepth: 2,
  crawlDelayMs: 1000,
  requestTimeoutMs: 10000,
  pageSpeedTimeoutMs: 45000,
  maxResponseBytes: 750000,
  maxConcurrency: 1,
  maxScanHistory: 50
} as const;

export const scoringWeights = {
  localVisibility: 20,
  leadConversion: 20,
  trustSignals: 15,
  messageClarity: 15,
  mobileExperience: 10,
  aiDiscoverability: 10,
  performance: 5,
  securityReliability: 5
} as const;

export type ScoringCategory = keyof typeof scoringWeights;

export const scoringCategoryLabels: Record<ScoringCategory, string> = {
  localVisibility: "Local Visibility",
  leadConversion: "Lead Conversion",
  trustSignals: "Trust Signals",
  messageClarity: "Message Clarity",
  mobileExperience: "Mobile Experience",
  aiDiscoverability: "AI Discoverability",
  performance: "Performance",
  securityReliability: "Security & Reliability"
};

export const disclaimer =
  "This is an automated public website assessment, not a legal, SEO, accessibility, or security compliance certification.";

const privateIpv4Ranges = [
  /^10\./,
  /^127\./,
  /^169\.254\./,
  /^172\.(1[6-9]|2\d|3[0-1])\./,
  /^192\.168\./,
  /^0\./
];

const blockedHostnames = new Set(["localhost", "0.0.0.0"]);

export const assessmentUrlSchema = z
  .string()
  .trim()
  .transform((value, context) => {
    if (/^[a-z][a-z0-9+.-]*:/i.test(value)) {
      try {
        return new URL(value);
      } catch {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Assessment URL must be a valid public website."
        });
        return z.NEVER;
      }
    }

    try {
      return new URL(`https://${value}`);
    } catch {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Assessment URL must be a valid public website."
      });
      return z.NEVER;
    }
  })
  .superRefine((url, context) => {
    if (!["http:", "https:"].includes(url.protocol)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Assessment URL must use http or https."
      });
    }

    if (url.username || url.password) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Assessment URL must not include credentials."
      });
    }

    const hostname = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
    const ipVersion = isIP(hostname);

    if (ipVersion === 0) {
      const labels = hostname.split(".");
      const hasValidDomainShape =
        labels.length >= 2 &&
        labels.every((label) =>
          /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i.test(label)
        ) &&
        /^[a-z]{2,63}$/i.test(labels[labels.length - 1] ?? "");

      if (!hasValidDomainShape) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Assessment URL must use a valid public domain."
        });
      }
    }

    if (blockedHostnames.has(hostname) || hostname.endsWith(".localhost")) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Assessment URL must be a public website."
      });
    }

    if (ipVersion === 4 && privateIpv4Ranges.some((range) => range.test(hostname))) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Assessment URL must not use a private IP address."
      });
    }

    if (
      ipVersion === 6 &&
      (hostname === "::1" || hostname.toLowerCase().startsWith("fc"))
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Assessment URL must not use a private IP address."
      });
    }
  });

export type CategoryAssessment = {
  category: ScoringCategory;
  label: string;
  weight: number;
  scoreStatus: "scored" | "unavailable";
  score: number;
  factors: CategoryScoreFactor[];
  scoreExplanation: {
    formula: string;
    passedFactors: number;
    totalFactors: number;
    weightedContribution: number;
    confidence: "low" | "medium" | "high";
    summary: string;
  };
  evidenceFound: string[];
  evidenceMissing: string[];
  businessImpact: string;
  recommendedFix: string;
};

export type CategoryScoreFactor = {
  label: string;
  passed: boolean;
  evidence: string;
  evidenceDetails: string[];
  check: string;
  businessExplanation: string;
  existingContentNote: string;
  recommendedAction: string;
  scoreImpact: number;
};

export type AssessmentStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "insufficient_evidence";

export type AssessmentJob = {
  id: string;
  url: string;
  domain: string;
  status: AssessmentStatus;
  createdAt: string;
  updatedAt: string;
  startedAt?: string;
  completedAt?: string;
  failedAt?: string;
  error?: string;
  report?: AssessmentReport;
};

export type AssessmentReport = {
  id: string;
  url: string;
  domain: string;
  grade: "A" | "B" | "C" | "D" | "F";
  overallScore: number;
  executiveSummary: string;
  categories: CategoryAssessment[];
  topBusinessProblems: string[];
  topRecommendedFixes: string[];
  revenueLeakageExplanation: string;
  neighborReferralScore: number;
  disclaimer: typeof disclaimer;
  evidenceQuality: EvidenceQuality;
  crawlMetadata: CrawlMetadata;
  createdAt: string;
};

export type EvidenceQuality = {
  assessmentStatus: "successful" | "partial";
  confidence: "low" | "medium" | "high";
  pagesWithReadableText: number;
  meaningfulPages: number;
  totalTextCharacters: number;
  summary: string;
  limitations: string[];
};

export type CrawlMetadata = {
  startedUrl: string;
  durationMs: number;
  pagesCrawled: number;
  maxPages: number;
  maxDepth: number;
  requestTimeoutMs: number;
  maxResponseBytes: number;
  maxConcurrency: number;
  robotsTxtFound: boolean;
  robotsTxtUrl: string;
  skippedUrls: Array<{
    url: string;
    reason: string;
  }>;
  decisions: CrawlDecision[];
  adapterFailures: Array<{
    url: string;
    operation: string;
    message: string;
  }>;
  pagespeed: {
    status: "skipped" | "success" | "failed";
    explanation: string;
    mobilePerformanceScore?: number;
  };
};

export type CrawlDecision = {
  url: string;
  action: "crawled" | "skipped" | "failed";
  reason: string;
  method: "GET" | "HEAD";
  status?: number;
  durationMs?: number;
  bytesRead?: number;
};

export type ExtractedSignals = {
  pages: Array<{
    url: string;
    title: string;
    metaDescription: string;
    text: string;
    links: string[];
    linkDetails: Array<{
      href: string;
      label: string;
    }>;
    images: string[];
    imageDetails: Array<{
      src: string;
      alt: string;
    }>;
    forms: number;
    status: number;
    bytesRead: number;
    truncated: boolean;
    mobileViewportFound: boolean;
    openGraphImageFound: boolean;
    localBusinessSchemaFound: boolean;
  }>;
  phoneNumbers: string[];
  clickToCallLinks: string[];
  contactLinks: string[];
  ctaPhrases: string[];
  cityOrServiceAreaMentions: string[];
  localBusinessSchemaFound: boolean;
  locationPageUrls: string[];
  mapsOrBusinessProfileLinks: string[];
  testimonialMentions: string[];
  reviewMentions: string[];
  photoSignals: string[];
  aboutPageUrls: string[];
  certificationMentions: string[];
  yearsInBusinessMentions: string[];
  caseStudyMentions: string[];
  serviceDescriptions: string[];
  customerTypeMentions: string[];
  differentiationMentions: string[];
  faqSignals: string[];
  structuredContentSignals: string[];
  mobileViewportFound: boolean;
  brokenLinks: BrokenAsset[];
  brokenImages: BrokenAsset[];
  https: boolean;
  faviconFound: boolean;
  openGraphImageFound: boolean;
  sitemapFound: boolean;
  securityHeaders: string[];
};

export type BrokenAsset = {
  kind: "link" | "image";
  sourcePage: string;
  url: string;
  status?: number;
  label?: string;
  alt?: string;
  reason?: string;
};

export function validateAssessmentUrl(value: string): URL {
  const url = assessmentUrlSchema.parse(value);
  url.hash = "";
  return url;
}

export function categoryWeightTotal(): number {
  return Object.values(scoringWeights).reduce((total, weight) => total + weight, 0);
}

export function gradeFromScore(score: number): AssessmentReport["grade"] {
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  if (score >= 70) return "C";
  if (score >= 60) return "D";
  return "F";
}

export function redactSecrets(message: string): string {
  return message
    .replace(/(api[_-]?key|token|secret|password)=([^\s&]+)/gi, "$1=[REDACTED]")
    .replace(/Bearer\s+[A-Za-z0-9._~+/-]+=*/g, "Bearer [REDACTED]")
    .replace(/sk-[A-Za-z0-9_-]{12,}/g, "[REDACTED]");
}
