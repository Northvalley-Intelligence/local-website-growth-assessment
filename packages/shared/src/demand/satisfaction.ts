import { demandRecords as defaultDemandRecords } from "./records.js";

const priorityWeight = {
  high: 3,
  medium: 2,
  low: 1
} as const;

const coverageValue = {
  covered: 1,
  likely_covered: 0.7,
  partial: 0.45,
  not_found: 0,
  insufficient_evidence: null
} as const;

const intentRules: Record<
  string,
  {
    label: string;
    terms: string[];
  }
> = {
  "Emergency / Urgent": {
    label: "urgent availability",
    terms: ["emergency", "24 hour", "24/7", "same day", "open now", "after hours"]
  },
  "Cost / Pricing": {
    label: "pricing or estimate guidance",
    terms: [
      "cost",
      "price",
      "pricing",
      "rates",
      "estimate",
      "quote",
      "free estimate",
      "financing"
    ]
  },
  Service: {
    label: "service coverage",
    terms: []
  },
  "Local / Near Me": {
    label: "local service coverage",
    terms: []
  },
  "Education / Research": {
    label: "educational answer",
    terms: ["faq", "frequently asked", "how much", "what is", "how often", "guide"]
  },
  "Trust / Provider Selection": {
    label: "trust proof",
    terms: [
      "review",
      "reviews",
      "testimonial",
      "testimonials",
      "rating",
      "licensed",
      "insured",
      "certified",
      "award"
    ]
  },
  Financing: {
    label: "payment or financing option",
    terms: ["financing", "payment plan", "monthly payment", "pay over time"]
  }
};

const sectorServiceTerms = {
  hvac: {
    ac_repair: ["ac repair", "air conditioner repair", "air conditioning repair"],
    ac_installation: ["ac installation", "air conditioner installation"],
    heating_repair: ["heating repair", "furnace repair", "heat pump repair"],
    maintenance: ["maintenance", "tune up", "tune-up", "system inspection"],
    emergency_service: ["emergency hvac", "24 hour hvac", "same day hvac"],
    cost: ["hvac cost", "ac repair cost", "estimate", "quote"]
  },
  roofing: {
    roof_repair: ["roof repair", "roof leak", "patch a roof"],
    replacement: ["roof replacement", "replace roof", "new roof"],
    inspection: ["roof inspection", "inspect roof"],
    emergency_service: ["emergency roof", "storm damage"],
    cost: ["roof cost", "roof replacement cost", "roof repair cost", "estimate"],
    maintenance: ["roof maintenance", "gutter"]
  },
  pest_control: {
    general_pest_control: ["pest control", "exterminator", "bug treatment"],
    termite_control: ["termite", "termite treatment"],
    rodent_control: ["rodent", "mouse", "mice", "rat"],
    bed_bug_treatment: ["bed bug", "bedbug"],
    emergency_service: ["emergency pest", "same day pest"],
    prevention: ["prevention", "quarterly service"]
  },
  real_estate: {
    buying: ["homes for sale", "houses for sale", "buy a home", "home search"],
    selling: ["sell your home", "selling a home", "listing agent"],
    relocation: ["relocation", "moving to", "move to"],
    schools: ["schools", "school district"],
    neighborhoods: ["neighborhood", "community", "area guide"],
    home_value: ["home value", "what is my home worth", "valuation"]
  },
  closet_wardrobe_design: {
    custom_closets: ["custom closet", "closet design", "closet installation"],
    walk_in_closets: ["walk in closet", "walk-in closet"],
    wardrobe_design: ["wardrobe design", "wardrobe system"],
    garage_storage: ["garage storage", "garage organization"],
    cost: ["closet cost", "closet pricing", "estimate", "quote"],
    consultation: ["consultation", "design consultation"]
  },
  cleaning: {
    house_cleaning: ["house cleaning", "home cleaning", "maid service"],
    deep_cleaning: ["deep cleaning"],
    move_out_cleaning: ["move out cleaning", "move-in cleaning", "move in cleaning"],
    commercial_cleaning: ["commercial cleaning", "office cleaning"],
    recurring_cleaning: ["recurring cleaning", "weekly cleaning", "biweekly cleaning"],
    cost: ["cleaning cost", "cleaning rates", "price", "estimate"]
  }
} as const;

const sectorLabels: Record<DemandSector, string> = {
  hvac: "HVAC",
  roofing: "Roofing",
  pest_control: "Pest Control",
  real_estate: "Real Estate",
  closet_wardrobe_design: "Closet & Wardrobe Design",
  cleaning: "Cleaning"
};

export type DemandCoverage =
  | "covered"
  | "likely_covered"
  | "partial"
  | "not_found"
  | "insufficient_evidence";

export type DemandSector = keyof typeof sectorServiceTerms;

export type DemandRecordInput = {
  id: string;
  sector: string;
  subcategory: string;
  keyword: string;
  normalized_keyword: string;
  intent: string;
  priority: "high" | "medium" | "low";
  location_modifier: string | null;
  active: boolean;
};

export type DemandEvidence = {
  page: string;
  matched: string;
  evidence: string;
};

export type DemandSatisfactionRecord = {
  demandRecordId: string;
  keyword: string;
  sector: string;
  subcategory: string;
  intent: string;
  priority: "high" | "medium" | "low";
  locationModifier: string | null;
  weight: number;
  coverage: DemandCoverage;
  confidence: "low" | "medium" | "high";
  foundEvidence: DemandEvidence[];
  missingSignals: string[];
  pagesChecked: string[];
  rationale: string;
};

export type DemandSatisfactionReport = {
  status: "assessed" | "skipped" | "insufficient_evidence";
  sector: DemandSector | null;
  sectorLabel: string | null;
  score: number | null;
  confidence: "low" | "medium" | "high";
  demandRecordsEvaluated: number;
  pagesChecked: string[];
  summary: string;
  foundSummary: string[];
  missingSummary: string[];
  intentCoverage: DemandCoverageGroup[];
  categoryCoverage: DemandCoverageGroup[];
  opportunities: DemandOpportunity[];
  records: DemandSatisfactionRecord[];
};

export type DemandCoverageGroup = {
  key: string;
  total: number;
  covered: number;
  likelyCovered: number;
  partial: number;
  notFound: number;
  insufficientEvidence: number;
  weightedScore: number | null;
};

export type DemandOpportunity = {
  keyword: string;
  intent: string;
  subcategory: string;
  coverage: DemandCoverage;
  confidence: "low" | "medium" | "high";
  whyItMatters: string;
  foundEvidence: DemandEvidence[];
  missingSignals: string[];
  pagesChecked: string[];
};

export type DemandWebsiteEvidence = {
  pages: Array<{
    url: string;
    title?: string;
    metaDescription?: string;
    text?: string;
  }>;
};

export function assessDemandSatisfaction(input: {
  websiteEvidence: DemandWebsiteEvidence;
  demandRecords?: readonly DemandRecordInput[];
}): DemandSatisfactionReport {
  const pages = normalizePages(input.websiteEvidence);
  const records = input.demandRecords ?? defaultDemandRecords;
  const sector = inferDemandSector(pages);

  if (pages.length === 0) {
    return skippedReport({
      status: "insufficient_evidence",
      sector: null,
      pages,
      summary:
        "Demand fit was not assessed because no readable website pages were available."
    });
  }

  if (!sector) {
    return skippedReport({
      status: "skipped",
      sector: null,
      pages,
      summary:
        "Demand fit was not assessed because the website industry could not be identified confidently from the checked pages."
    });
  }

  const activeDemand = records.filter(
    (record) => record.active === true && record.sector === sector
  );

  if (activeDemand.length === 0) {
    return skippedReport({
      status: "skipped",
      sector,
      pages,
      summary: `Demand fit was not assessed because no active ${sectorLabels[sector]} demand records are available.`
    });
  }

  const assessedRecords = activeDemand.map((record) => assessRecord(record, pages));
  const scored = assessedRecords.filter(
    (record) => record.coverage !== "insufficient_evidence"
  );
  const totalWeight = scored.reduce((sum, record) => sum + record.weight, 0);
  const earnedWeight = scored.reduce((sum, record) => {
    const value = coverageValue[record.coverage];
    return value === null ? sum : sum + record.weight * value;
  }, 0);
  const score =
    totalWeight === 0 ? null : Math.round((earnedWeight / totalWeight) * 100);
  const foundSummary = buildFoundSummary(assessedRecords);
  const missingSummary = buildMissingSummary(assessedRecords);

  return {
    status: "assessed",
    sector,
    sectorLabel: sectorLabels[sector],
    score,
    confidence: confidenceFor(assessedRecords, pages),
    demandRecordsEvaluated: activeDemand.length,
    pagesChecked: pages.map((page) => page.url),
    summary: `The checked pages appear to satisfy ${score}/100 of weighted ${sectorLabels[sector]} customer-demand signals available in the current demand dataset.`,
    foundSummary,
    missingSummary,
    intentCoverage: summarizeBy(assessedRecords, "intent"),
    categoryCoverage: summarizeBy(assessedRecords, "subcategory"),
    opportunities: topOpportunities(assessedRecords),
    records: assessedRecords
  };
}

function skippedReport(input: {
  status: "skipped" | "insufficient_evidence";
  sector: DemandSector | null;
  pages: NormalizedDemandPage[];
  summary: string;
}): DemandSatisfactionReport {
  return {
    status: input.status,
    sector: input.sector,
    sectorLabel: input.sector ? sectorLabels[input.sector] : null,
    score: null,
    confidence: "low",
    demandRecordsEvaluated: 0,
    pagesChecked: input.pages.map((page) => page.url),
    summary: input.summary,
    foundSummary: [],
    missingSummary: [],
    intentCoverage: [],
    categoryCoverage: [],
    opportunities: [],
    records: []
  };
}

type NormalizedDemandPage = {
  url: string;
  text: string;
  rawText: string;
};

function normalizePages(
  websiteEvidence: DemandWebsiteEvidence
): NormalizedDemandPage[] {
  if (!websiteEvidence || !Array.isArray(websiteEvidence.pages)) return [];

  return websiteEvidence.pages
    .map((page, index) => {
      const textParts = [page.title, page.metaDescription, page.url, page.text];
      const rawText = textParts.filter(Boolean).join(" ");
      return {
        url: page.url || `page-${index + 1}`,
        text: normalizeKeyword(rawText),
        rawText
      };
    })
    .filter((page) => page.text.length > 0);
}

function inferDemandSector(pages: NormalizedDemandPage[]): DemandSector | null {
  const scores = (Object.keys(sectorServiceTerms) as DemandSector[]).map((sector) => {
    const terms = Object.values(sectorServiceTerms[sector]).flat();
    const matchedTerms = unique(
      terms.filter((term) =>
        pages.some((page) => page.text.includes(normalizeKeyword(term)))
      )
    );
    return {
      sector,
      score: matchedTerms.length,
      matchedTerms
    };
  });
  const [best, second] = scores.sort((a, b) => b.score - a.score);

  if (!best || best.score < 2) return null;
  if (second && best.score === second.score) return null;
  return best.sector;
}

function assessRecord(
  record: DemandRecordInput,
  pages: NormalizedDemandPage[]
): DemandSatisfactionRecord {
  const sector = record.sector as DemandSector;
  const keywordTerms = meaningfulTerms(record.normalized_keyword);
  const serviceTerms = serviceTermsFor(record);
  const intentRule = intentRules[record.intent] ?? {
    label: record.intent,
    terms: []
  };
  const keywordEvidence = findEvidence(pages, keywordTerms);
  const serviceEvidence = findEvidence(pages, serviceTerms);
  const intentEvidence = findEvidence(pages, intentRule.terms);
  const locationTerms = locationTermsFor(record.location_modifier);
  const locationEvidence =
    locationTerms.length > 0 ? findEvidence(pages, locationTerms) : null;
  const qualifierRules = keywordQualifierRules(
    record.normalized_keyword,
    intentRule.label
  );

  let coverage: DemandCoverage = "not_found";
  let confidence: DemandSatisfactionRecord["confidence"] = "medium";
  const foundEvidence: DemandEvidence[] = [];
  const missingSignals: string[] = [];
  const rationale: string[] = [];

  if (keywordEvidence) {
    coverage = "covered";
    confidence = "high";
    foundEvidence.push(keywordEvidence);
    rationale.push(
      "The exact or near-exact demand phrase appears in website evidence."
    );
  } else if (serviceEvidence) {
    coverage = "likely_covered";
    foundEvidence.push(serviceEvidence);
    rationale.push(
      "The exact search phrase was not found, but the underlying service appears to be offered."
    );
  }

  if (locationTerms.length > 0 && locationEvidence) {
    foundEvidence.push(locationEvidence);
    rationale.push("The relevant location or service-area signal was found.");
  } else if (locationTerms.length > 0) {
    coverage = downgrade(coverage);
    missingSignals.push(`Location signal not found for ${record.location_modifier}.`);
  }

  if (!["Service", "Local / Near Me"].includes(record.intent)) {
    if (intentEvidence) {
      foundEvidence.push(intentEvidence);
      if (coverage === "not_found") coverage = "partial";
      rationale.push(`The page contains ${intentRule.label} evidence.`);
    } else {
      coverage = downgrade(coverage);
      missingSignals.push(`No ${intentRule.label} evidence found on checked pages.`);
    }
  }

  for (const qualifierRule of qualifierRules) {
    const qualifierEvidence = findEvidence(pages, qualifierRule.terms);
    if (qualifierEvidence) {
      foundEvidence.push(qualifierEvidence);
      rationale.push(`The page contains ${qualifierRule.label} evidence.`);
    } else {
      coverage = downgrade(coverage);
      missingSignals.push(`No ${qualifierRule.label} evidence found on checked pages.`);
    }
  }

  if (coverage === "not_found") {
    missingSignals.push(
      `No matching service or intent evidence found for "${record.keyword}" on checked pages.`
    );
    rationale.push(
      "This is a gap in observed website evidence, not proof the business does not provide the service."
    );
  }

  return {
    demandRecordId: record.id,
    keyword: record.keyword,
    sector,
    subcategory: record.subcategory,
    intent: record.intent,
    priority: record.priority,
    locationModifier: record.location_modifier,
    weight: priorityWeight[record.priority] ?? 1,
    coverage,
    confidence,
    foundEvidence: uniqueEvidence(foundEvidence),
    missingSignals: unique(missingSignals),
    pagesChecked: pages.map((page) => page.url),
    rationale: rationale.join(" ")
  };
}

function serviceTermsFor(record: DemandRecordInput): string[] {
  const sector = record.sector as DemandSector;
  const sectorTerms = sectorServiceTerms[sector];
  const directTerms =
    sectorTerms?.[record.subcategory as keyof typeof sectorTerms] ?? [];
  const keywordTerms = meaningfulTerms(record.normalized_keyword);
  return unique([...directTerms, ...keywordTerms]);
}

function locationTermsFor(locationModifier: string | null): string[] {
  if (!locationModifier || locationModifier === "near me") return [];
  const normalized = normalizeKeyword(locationModifier);
  const withoutState = normalized.replace(/\bga\b/g, "").trim();
  const withoutCounty = withoutState.replace(/\bcounty\b/g, "").trim();
  return unique([normalized, withoutState, withoutCounty].filter(Boolean));
}

function keywordQualifierRules(normalizedKeyword: string, currentIntentLabel: string) {
  const keyword = normalizeKeyword(normalizedKeyword);
  const rules: Array<{ label: string; terms: string[] }> = [];

  if (/\b(payment plan|financing|pay over time|monthly payment)\b/.test(keyword)) {
    addIntentRule(rules, "Financing");
  }
  if (/\b(open now|same day|emergency|24 hour|24 7|after hours)\b/.test(keyword)) {
    addIntentRule(rules, "Emergency / Urgent");
  }
  if (/\b(cost|price|pricing|rates|how much|estimate|quote)\b/.test(keyword)) {
    addIntentRule(rules, "Cost / Pricing");
  }
  if (/\b(review|reviews|best|top rated|licensed|insured)\b/.test(keyword)) {
    addIntentRule(rules, "Trust / Provider Selection");
  }

  return uniqueByLabel(rules).filter((rule) => rule.label !== currentIntentLabel);
}

function addIntentRule(
  rules: Array<{ label: string; terms: string[] }>,
  key: string
): void {
  const rule = intentRules[key];
  if (rule) rules.push(rule);
}

function meaningfulTerms(normalizedKeyword: string): string[] {
  const words = normalizeKeyword(normalizedKeyword).split(" ").filter(Boolean);
  const terms = [words.join(" ")];

  for (let size = Math.min(4, words.length); size >= 2; size -= 1) {
    for (let index = 0; index <= words.length - size; index += 1) {
      const phrase = words.slice(index, index + size).join(" ");
      if (!isGenericPhrase(phrase)) terms.push(phrase);
    }
  }

  return unique(terms.filter((term) => term.length >= 4));
}

function isGenericPhrase(phrase: string): boolean {
  return [
    "near me",
    "how much",
    "what is",
    "in georgia",
    "services near",
    "for sale"
  ].includes(phrase);
}

function findEvidence(
  pages: NormalizedDemandPage[],
  terms: readonly string[]
): DemandEvidence | null {
  for (const term of terms) {
    const normalizedTerm = normalizeKeyword(term);
    if (!normalizedTerm) continue;

    for (const page of pages) {
      if (page.text.includes(normalizedTerm)) {
        return {
          page: page.url,
          matched: term,
          evidence: snippet(page.rawText, term)
        };
      }
    }
  }

  return null;
}

function snippet(rawText: string, term: string): string {
  const normalizedRaw = rawText.replace(/\s+/g, " ").trim();
  const index = normalizedRaw.toLowerCase().indexOf(String(term).toLowerCase());
  if (index === -1) return normalizedRaw.slice(0, 180);
  const start = Math.max(0, index - 70);
  return normalizedRaw.slice(start, start + 180);
}

function downgrade(coverage: DemandCoverage): DemandCoverage {
  if (coverage === "covered" || coverage === "likely_covered") return "partial";
  return coverage;
}

function summarizeBy(
  records: DemandSatisfactionRecord[],
  key: "intent" | "subcategory"
): DemandCoverageGroup[] {
  const groups = new Map<string, DemandCoverageGroup>();

  for (const record of records) {
    const groupKey = record[key];
    const group = groups.get(groupKey) ?? {
      key: groupKey,
      total: 0,
      covered: 0,
      likelyCovered: 0,
      partial: 0,
      notFound: 0,
      insufficientEvidence: 0,
      weightedScore: 0
    };
    group.total += 1;
    if (record.coverage === "covered") group.covered += 1;
    if (record.coverage === "likely_covered") group.likelyCovered += 1;
    if (record.coverage === "partial") group.partial += 1;
    if (record.coverage === "not_found") group.notFound += 1;
    if (record.coverage === "insufficient_evidence") group.insufficientEvidence += 1;
    groups.set(groupKey, group);
  }

  return [...groups.values()].map((group) => {
    const groupRecords = records.filter((record) => record[key] === group.key);
    const totalWeight = groupRecords.reduce((sum, record) => sum + record.weight, 0);
    const earned = groupRecords.reduce((sum, record) => {
      const value = coverageValue[record.coverage];
      return value === null ? sum : sum + record.weight * value;
    }, 0);
    return {
      ...group,
      weightedScore: totalWeight === 0 ? null : Math.round((earned / totalWeight) * 100)
    };
  });
}

function topOpportunities(records: DemandSatisfactionRecord[]): DemandOpportunity[] {
  return records
    .filter((record) => ["not_found", "partial"].includes(record.coverage))
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 5)
    .map((record) => ({
      keyword: record.keyword,
      intent: record.intent,
      subcategory: record.subcategory,
      coverage: record.coverage,
      confidence: record.confidence,
      whyItMatters: opportunityImpact(record),
      foundEvidence: record.foundEvidence,
      missingSignals: record.missingSignals,
      pagesChecked: record.pagesChecked
    }));
}

function opportunityImpact(record: DemandSatisfactionRecord): string {
  if (record.intent === "Cost / Pricing") {
    return "People comparing cost may leave if the website does not explain pricing factors, estimates, or next steps.";
  }
  if (record.intent === "Local / Near Me") {
    return "Local searchers need to see that this business serves their city or county.";
  }
  if (record.intent === "Emergency / Urgent") {
    return "Urgent searchers need visible availability, fast response language, or a clear call path.";
  }
  if (record.intent === "Education / Research") {
    return "Research-oriented visitors may not be ready to call until common questions are answered.";
  }
  if (record.intent === "Trust / Provider Selection") {
    return "Provider-selection searches need proof such as reviews, testimonials, licenses, or credentials.";
  }
  return "This customer demand appears in the dataset, but the checked pages did not clearly satisfy it.";
}

function buildFoundSummary(records: DemandSatisfactionRecord[]): string[] {
  return records
    .filter((record) => record.foundEvidence.length > 0)
    .slice(0, 5)
    .map((record) => {
      const evidence = record.foundEvidence[0];
      return `${record.keyword}: found "${evidence?.matched}" on ${evidence?.page}.`;
    });
}

function buildMissingSummary(records: DemandSatisfactionRecord[]): string[] {
  return records
    .filter((record) => record.missingSignals.length > 0)
    .slice(0, 5)
    .map((record) => `${record.keyword}: ${record.missingSignals[0]}`);
}

function confidenceFor(
  records: DemandSatisfactionRecord[],
  pages: NormalizedDemandPage[]
): "low" | "medium" | "high" {
  if (pages.length === 0 || records.length === 0) return "low";
  const highConfidenceRecords = records.filter(
    (record) => record.confidence === "high"
  ).length;
  if (highConfidenceRecords / records.length > 0.5) return "high";
  return "medium";
}

function normalizeKeyword(keyword: string): string {
  return keyword
    .toLowerCase()
    .replace(/[']/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function unique(values: readonly string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

function uniqueEvidence(values: DemandEvidence[]): DemandEvidence[] {
  const seen = new Set<string>();
  return values.filter((value) => {
    const key = `${value.page}-${value.matched}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function uniqueByLabel<T extends { label: string }>(rules: T[]): T[] {
  const seen = new Set<string>();
  return rules.filter((rule) => {
    if (!rule || seen.has(rule.label)) return false;
    seen.add(rule.label);
    return true;
  });
}
