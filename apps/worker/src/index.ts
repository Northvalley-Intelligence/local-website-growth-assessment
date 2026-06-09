import {
  crawlerPolicy,
  disclaimer,
  gradeFromScore,
  redactSecrets,
  scoringCategoryLabels,
  scoringWeights,
  type AssessmentReport,
  type CategoryAssessment,
  type CrawlMetadata,
  type CrawlDecision,
  type EvidenceQuality,
  type ExtractedSignals,
  type ScoringCategory,
  validateAssessmentUrl
} from "@northvalleyintel/assessment-shared";

export type FetchResponse = {
  url: string;
  status: number;
  headers: {
    get(name: string): string | null;
  };
  text(): Promise<string>;
};

export type FetchAdapter = (
  url: string,
  init?: {
    method?: "GET" | "HEAD";
    headers?: Record<string, string>;
    signal?: AbortSignal;
  }
) => Promise<FetchResponse>;

export type PageSpeedAdapter = (input: {
  url: string;
  apiKey: string;
}) => Promise<{ mobilePerformanceScore: number; summary: string }>;

export type AssessmentEvent = {
  type:
    | "assessment.started"
    | "assessment.completed"
    | "crawl.failed"
    | "pagespeed.failed";
  message: string;
  url?: string;
  metadata?: Record<string, string | number | boolean>;
};

export type AssessWebsiteOptions = {
  fetchAdapter?: FetchAdapter;
  pageSpeedAdapter?: PageSpeedAdapter;
  pagespeedApiKey?: string;
  now?: () => Date;
  crawlDelayMs?: number;
  requestTimeoutMs?: number;
  pageSpeedTimeoutMs?: number;
  maxResponseBytes?: number;
  eventSink?: (event: AssessmentEvent) => void;
};

export class InsufficientEvidenceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InsufficientEvidenceError";
  }
}

type CrawledPage = ExtractedSignals["pages"][number];

type RobotsRules = {
  found: boolean;
  disallow: string[];
  crawlDelayMs?: number;
};

const privatePathPattern =
  /\/(admin|wp-admin|login|log-in|signin|sign-in|account|portal|dashboard|checkout|cart|private|members)(\/|$)/i;

export async function assessWebsite(
  request: { url: string },
  options: AssessWebsiteOptions = {}
): Promise<AssessmentReport> {
  const startedAt = Date.now();
  const startedUrl = validateAssessmentUrl(request.url);
  emitAssessmentEvent(options.eventSink, {
    type: "assessment.started",
    message: "Assessment started.",
    url: startedUrl.href
  });
  const fetchAdapter = options.fetchAdapter ?? defaultFetchAdapter;
  const requestTimeoutMs = options.requestTimeoutMs ?? crawlerPolicy.requestTimeoutMs;
  const maxResponseBytes = options.maxResponseBytes ?? crawlerPolicy.maxResponseBytes;
  const crawl = await crawlWebsite(startedUrl, fetchAdapter, {
    crawlDelayMs: options.crawlDelayMs ?? crawlerPolicy.crawlDelayMs,
    requestTimeoutMs,
    maxResponseBytes,
    eventSink: options.eventSink
  });
  const evidenceQuality = evaluateEvidenceQuality(crawl);
  if (evidenceQuality.assessmentStatus === "insufficient") {
    throw new InsufficientEvidenceError(evidenceQuality.summary);
  }
  const pagespeed = await runPageSpeed(startedUrl.href, {
    ...options,
    requestTimeoutMs,
    pageSpeedTimeoutMs: options.pageSpeedTimeoutMs ?? crawlerPolicy.pageSpeedTimeoutMs
  });
  const signals = await extractSignals(startedUrl, crawl.pages, fetchAdapter, {
    requestTimeoutMs
  });
  const categories = scoreSignals(signals, pagespeed, evidenceQuality.reportQuality);
  const overallScore = weightedOverallScore(categories);
  const createdAt = (options.now ?? (() => new Date()))().toISOString();
  const domain = startedUrl.hostname;

  const scoredCategories = categories.filter(
    (category) => category.scoreStatus !== "unavailable"
  );
  const weakest = [...scoredCategories].sort((a, b) => a.score - b.score).slice(0, 5);
  const problemCategories = weakest.filter((category) => category.score < 80);
  const strongest = [...scoredCategories].sort((a, b) => b.score - a.score)[0];

  const crawlMetadata: CrawlMetadata = {
    startedUrl: startedUrl.href,
    durationMs: Date.now() - startedAt,
    pagesCrawled: crawl.pages.length,
    maxPages: crawlerPolicy.maxPages,
    maxDepth: crawlerPolicy.maxDepth,
    requestTimeoutMs,
    maxResponseBytes,
    maxConcurrency: crawlerPolicy.maxConcurrency,
    robotsTxtFound: crawl.robots.found,
    robotsTxtUrl: new URL("/robots.txt", startedUrl.origin).href,
    skippedUrls: crawl.skippedUrls,
    decisions: crawl.decisions,
    adapterFailures: crawl.adapterFailures,
    pagespeed
  };

  const report: AssessmentReport = {
    id: stableScanId(domain, createdAt),
    url: startedUrl.href,
    domain,
    grade: gradeFromScore(overallScore),
    overallScore,
    executiveSummary: buildExecutiveSummary(overallScore, weakest, strongest),
    categories,
    topBusinessProblems: problemCategories.map(
      (category) => `${category.label}: ${category.businessImpact}`
    ),
    topRecommendedFixes: problemCategories.map(
      (category) => `${category.label}: ${category.recommendedFix}`
    ),
    revenueLeakageExplanation:
      "When visitors cannot quickly confirm what you do, where you work, why they should trust you, and how to contact you, some of those visitors leave instead of becoming calls, bookings, or estimate requests.",
    neighborReferralScore: Math.max(1, Math.min(10, Math.round(overallScore / 10))),
    disclaimer,
    evidenceQuality: evidenceQuality.reportQuality,
    crawlMetadata,
    createdAt
  };

  emitAssessmentEvent(options.eventSink, {
    type: "assessment.completed",
    message: "Assessment completed.",
    url: startedUrl.href,
    metadata: {
      pagesCrawled: crawlMetadata.pagesCrawled,
      durationMs: crawlMetadata.durationMs
    }
  });

  return report;
}

export async function crawlWebsite(
  startedUrl: URL,
  fetchAdapter: FetchAdapter,
  options: {
    crawlDelayMs: number;
    requestTimeoutMs?: number;
    maxResponseBytes?: number;
    eventSink?: (event: AssessmentEvent) => void;
  }
): Promise<{
  pages: CrawledPage[];
  robots: RobotsRules;
  skippedUrls: Array<{ url: string; reason: string }>;
  decisions: CrawlDecision[];
  adapterFailures: Array<{ url: string; operation: string; message: string }>;
}> {
  const requestTimeoutMs = options.requestTimeoutMs ?? crawlerPolicy.requestTimeoutMs;
  const maxResponseBytes = options.maxResponseBytes ?? crawlerPolicy.maxResponseBytes;
  const decisions: CrawlDecision[] = [];
  const adapterFailures: Array<{ url: string; operation: string; message: string }> =
    [];
  const robots = await fetchRobotsRules(startedUrl, fetchAdapter, {
    requestTimeoutMs,
    maxResponseBytes,
    decisions,
    adapterFailures
  });
  const skippedUrls: Array<{ url: string; reason: string }> = [];
  const pages: CrawledPage[] = [];
  const seen = new Set<string>();
  const queued = new Set<string>([startedUrl.href]);
  const queue: Array<{ url: URL; depth: number }> = [{ url: startedUrl, depth: 0 }];
  const delayMs = robots.crawlDelayMs ?? options.crawlDelayMs;

  while (queue.length > 0 && pages.length < crawlerPolicy.maxPages) {
    const next = queue.shift();
    if (!next) break;

    const normalized = normalizeUrl(next.url);
    queued.delete(normalized);

    const skipReason = crawlSkipReason(next.url, startedUrl, robots, next.depth);
    if (skipReason) {
      skippedUrls.push({ url: next.url.href, reason: skipReason });
      decisions.push({
        url: next.url.href,
        action: "skipped",
        reason: skipReason,
        method: "GET"
      });
      continue;
    }

    if (seen.has(normalized)) continue;
    seen.add(normalized);

    if (pages.length > 0 && delayMs > 0) {
      await sleep(delayMs);
    }

    let fetched: Awaited<ReturnType<typeof safeFetch>>;
    try {
      fetched = await safeFetch(fetchAdapter, next.url.href, {
        method: "GET",
        requestTimeoutMs
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Request failed";
      adapterFailures.push({
        url: next.url.href,
        operation: "crawl fetch",
        message
      });
      emitAssessmentEvent(options.eventSink, {
        type: "crawl.failed",
        message,
        url: next.url.href
      });
      decisions.push({
        url: next.url.href,
        action: "failed",
        reason: message,
        method: "GET"
      });
      skippedUrls.push({ url: next.url.href, reason: message });
      continue;
    }

    const finalUrl = new URL(fetched.response.url || next.url.href);
    if (!isAllowedSubmittedDomainVariant(finalUrl, startedUrl)) {
      const reason = "redirected outside submitted domain";
      skippedUrls.push({ url: next.url.href, reason });
      decisions.push({
        url: next.url.href,
        action: "skipped",
        reason,
        method: "GET",
        status: fetched.response.status,
        durationMs: fetched.durationMs
      });
      continue;
    }

    const contentType = fetched.response.headers.get("content-type") ?? "";
    const readable = contentType.includes("text/html");
    const textResult = readable
      ? await readTextWithinLimit(fetched.response, maxResponseBytes)
      : { text: "", bytesRead: 0, truncated: false };
    const page = parsePage(
      finalUrl.href,
      fetched.response.status,
      textResult.text,
      textResult
    );
    pages.push(page);
    decisions.push({
      url: finalUrl.href,
      action: "crawled",
      reason: textResult.truncated
        ? "crawled with response truncated at size limit"
        : "crawled",
      method: "GET",
      status: fetched.response.status,
      durationMs: fetched.durationMs,
      bytesRead: textResult.bytesRead
    });

    if (
      fetched.response.status >= 400 ||
      !textResult.text ||
      next.depth >= crawlerPolicy.maxDepth
    ) {
      continue;
    }

    for (const href of page.links) {
      const discovered = toAbsoluteUrl(href, finalUrl);
      if (!discovered) continue;

      const discoveredNormalized = normalizeUrl(discovered);
      if (
        !seen.has(discoveredNormalized) &&
        !queued.has(discoveredNormalized) &&
        pages.length + queue.length < crawlerPolicy.maxPages
      ) {
        queue.push({ url: discovered, depth: next.depth + 1 });
        queued.add(discoveredNormalized);
      }
    }
  }

  return { pages, robots, skippedUrls, decisions, adapterFailures };
}

export async function extractSignals(
  startedUrl: URL,
  pages: CrawledPage[],
  fetchAdapter: FetchAdapter,
  options: { requestTimeoutMs?: number } = {}
): Promise<ExtractedSignals> {
  const allText = pages.map((page) => page.text).join(" ");
  const allHtmlSearchText = pages
    .map((page) => `${page.title} ${page.metaDescription} ${page.text}`)
    .join(" ");
  const allLinks = unique(pages.flatMap((page) => page.links));
  const allImages = unique(pages.flatMap((page) => page.images));
  const allLinkDetails = pages.flatMap((page) =>
    page.linkDetails.map((link) => ({
      value: link.href,
      sourcePage: page.url,
      label: link.label
    }))
  );
  const allImageDetails = pages.flatMap((page) =>
    page.imageDetails.map((image) => ({
      value: image.src,
      sourcePage: page.url,
      alt: image.alt
    }))
  );

  const linkChecks = await checkBrokenAssets(
    startedUrl,
    allLinkDetails,
    fetchAdapter,
    "link",
    options
  );
  const imageChecks = await checkBrokenAssets(
    startedUrl,
    allImageDetails,
    fetchAdapter,
    "image",
    options
  );

  const clickToCallLinks = allLinks.filter((link) =>
    link.toLowerCase().startsWith("tel:")
  );
  const visiblePhoneNumbers: string[] =
    allText.match(/\(?\d{3}\)?[-.\s]\d{3}[-.\s]\d{4}/g) ?? [];
  const phoneNumbers = unique(
    visiblePhoneNumbers.concat(
      clickToCallLinks.map((link) => link.replace(/^tel:/i, ""))
    )
  );

  return {
    pages,
    phoneNumbers,
    clickToCallLinks,
    contactLinks: allLinks.filter((link) =>
      /contact|quote|estimate|appointment|book/i.test(link)
    ),
    ctaPhrases: findMatches(allText, [
      "call today",
      "request an estimate",
      "get a quote",
      "book online",
      "schedule",
      "appointment",
      "contact us"
    ]),
    cityOrServiceAreaMentions: findMatches(allHtmlSearchText, [
      "serving",
      "service area",
      "near",
      "county",
      "locally owned",
      "local"
    ]),
    localBusinessSchemaFound: pages.some((page) => page.localBusinessSchemaFound),
    locationPageUrls: allLinks.filter((link) =>
      /location|service-area|service-areas|areas-we-serve|areas-served|areas-de-servicio|near|woodstock|marietta|kennesaw|acworth|canton|roswell/i.test(
        link
      )
    ),
    mapsOrBusinessProfileLinks: allLinks.filter((link) =>
      /google\.com\/maps|goo\.gl\/maps|google\.com\/search|g\.page/i.test(link)
    ),
    testimonialMentions: detectTestimonialSignals(allText),
    reviewMentions: findMatches(allText, [
      "review",
      "reviews",
      "reseña",
      "reseñas",
      "stars",
      "rated",
      "5 stars"
    ]),
    photoSignals: allImages.filter((image) =>
      /team|owner|before|after|project|gallery|photo/i.test(image)
    ),
    aboutPageUrls: allLinks.filter((link) => /about|team|owner/i.test(link)),
    certificationMentions: findMatches(allText, [
      "licensed",
      "insured",
      "certified",
      "award",
      "accredited"
    ]),
    yearsInBusinessMentions: unique(
      allText.match(/\d{1,3}\+?\s+years? in business/gi) ?? []
    ),
    caseStudyMentions: findMatches(allText, [
      "case study",
      "before and after",
      "project"
    ]),
    serviceDescriptions: findMatches(allText, [
      "services",
      "we provide",
      "specialize in"
    ]),
    customerTypeMentions: findMatches(allText, [
      "homeowners",
      "families",
      "businesses",
      "commercial"
    ]),
    differentiationMentions: findMatches(allText, [
      "family owned",
      "locally owned",
      "same day",
      "guarantee",
      "trusted"
    ]),
    faqSignals: findMatches(allText, ["faq", "frequently asked", "questions"]),
    structuredContentSignals: findMatches(allText, [
      "services",
      "areas we serve",
      "how it works"
    ]),
    mobileViewportFound: pages.some((page) => page.mobileViewportFound),
    brokenLinks: linkChecks,
    brokenImages: imageChecks,
    https: startedUrl.protocol === "https:",
    faviconFound: allLinks.some((link) => /favicon|icon/i.test(link)),
    openGraphImageFound: pages.some((page) => page.openGraphImageFound),
    sitemapFound: await sitemapExists(startedUrl, fetchAdapter),
    securityHeaders: collectSecurityHeaders(pages)
  };
}

function scoreSignals(
  signals: ExtractedSignals,
  pagespeed: CrawlMetadata["pagespeed"],
  evidenceQuality: EvidenceQuality
): CategoryAssessment[] {
  const reviewedPages = pagesCheckedDetails(signals.pages);
  const phoneReview = phoneEvidenceDetails(signals);
  const locationReview = locationEvidenceDetails(signals);
  const testimonialReview = testimonialEvidenceDetails(signals);
  const mapsReview = signalEvidenceDetails(
    reviewedPages,
    "Google Maps or Google Business links found",
    signals.mapsOrBusinessProfileLinks
  );

  return [
    buildCategory(
      "localVisibility",
      evidenceQuality.confidence,
      [
        evidence(
          signals.cityOrServiceAreaMentions.length > 0,
          "Service area language",
          foundWithExamples(
            "Service area language is visible.",
            signals.cityOrServiceAreaMentions
          ),
          foundWithExamples(
            "We found language that helps visitors understand where this business works.",
            signals.cityOrServiceAreaMentions
          ),
          "Clear city or service-area language is missing.",
          "Local customers need to quickly confirm that the business serves their area before they call or request help.",
          "A general biography or services page may describe the business, but this check looks for clear geographic language that connects the business to local searches and local buyers.",
          "Add clear city, county, neighborhood, or service-area language near the top of important pages.",
          {
            missingDetails: signalEvidenceDetails(
              reviewedPages,
              "Service-area language found",
              signals.cityOrServiceAreaMentions
            )
          }
        ),
        evidence(
          signals.phoneNumbers.length > 0,
          "Visible phone number",
          foundWithExamples("A phone number is visible.", signals.phoneNumbers),
          foundWithExamples(
            "We found a phone number on the crawled public pages.",
            signals.phoneNumbers
          ),
          "Business phone number is hard to find.",
          "Local visitors often want to call quickly. If the phone number is hard to find, some ready-to-buy visitors will leave.",
          "A contact page can help, but this check looks for phone visibility where visitors are already reading.",
          "Place the phone number in the header, footer, and main contact sections.",
          { missingDetails: phoneReview }
        ),
        evidence(
          signals.localBusinessSchemaFound,
          "Structured business information",
          "LocalBusiness schema appears to be present.",
          "We found structured business information that can help search engines and AI systems understand the business.",
          "Structured business information was not found.",
          "We found public website content, but not the machine-readable business information that helps Google and AI systems confidently understand who you are, where you operate, and what services you provide.",
          "A biography, address, or service page helps human visitors. LocalBusiness schema is an additional machine-readable signal for search engines, AI assistants, and local discovery systems.",
          "Add LocalBusiness schema with business name, service area, phone number, address if public, and core services.",
          { missingDetails: reviewedPages }
        ),
        evidence(
          signals.locationPageUrls.length > 0,
          "Location or service-area pages",
          foundWithExamples(
            "Location or service-area pages were found.",
            signals.locationPageUrls
          ),
          foundWithExamples(
            "We found crawlable pages that appear to focus on locations or service areas.",
            signals.locationPageUrls
          ),
          "Location or service-area pages were not found.",
          "Local customers and search systems need specific pages that connect services to the areas where the business wants leads.",
          "A homepage may mention locations, but dedicated location or service-area pages give each market a clearer landing point.",
          "Create focused pages for the highest-value cities, neighborhoods, or service areas.",
          { missingDetails: locationReview }
        ),
        evidence(
          signals.mapsOrBusinessProfileLinks.length > 0,
          "Google Business connection",
          foundWithExamples(
            "Google Maps or Business Profile link was found.",
            signals.mapsOrBusinessProfileLinks
          ),
          foundWithExamples(
            "We found a direct connection from the website to a Google Maps or Google Business presence.",
            signals.mapsOrBusinessProfileLinks
          ),
          "Google Business Profile connection was not found.",
          "We could not find a direct connection between the website and Google Business presence. This may make it harder for visitors and search engines to connect the website with local reputation and reviews.",
          "Reviews or testimonials on the website are useful, but this check looks for a verifiable bridge to the business's Google local presence.",
          "Link to the Google Business Profile or Google Maps listing from the contact page, footer, or review section.",
          { missingDetails: mapsReview }
        )
      ],
      reviewedPages
    ),
    buildCategory(
      "leadConversion",
      evidenceQuality.confidence,
      [
        evidence(
          signals.phoneNumbers.length > 0,
          "Phone number availability",
          "Phone number appears on public pages.",
          "We found a phone number visitors can use to contact the business.",
          "Phone number is not visible on crawled pages.",
          "A missing or hidden phone number creates friction for visitors who are ready to talk now.",
          "A contact form helps some visitors, but phone visibility supports urgent or high-intent prospects.",
          "Put a plain phone number in the header, footer, and contact sections.",
          { missingDetails: phoneReview }
        ),
        evidence(
          signals.clickToCallLinks.length > 0,
          "Click-to-call link",
          foundWithExamples("Click-to-call link was found.", signals.clickToCallLinks),
          foundWithExamples(
            "We found a phone link that mobile visitors can tap to call.",
            signals.clickToCallLinks
          ),
          "Click-to-call link was not found.",
          "Mobile visitors may have to copy or retype the number, which can reduce calls.",
          "A visible phone number is good, but a click-to-call link is the mobile-friendly signal.",
          "Make the primary phone number a `tel:` link on mobile and desktop.",
          { missingDetails: phoneReview }
        ),
        evidence(
          signals.pages.some((page) => page.forms > 0),
          "Contact form",
          "A contact form appears to be available.",
          "We found a form visitors can use to request contact.",
          "Contact form was not found.",
          "Some prospects prefer forms because they can explain their need without calling during business hours.",
          "Phone calls are important, but forms capture visitors who are not ready or able to call.",
          "Add a short contact, estimate, booking, or consultation form."
        ),
        evidence(
          signals.ctaPhrases.length > 0,
          "Lead-focused call to action",
          "Lead-focused calls to action were found.",
          "We found language asking visitors to call, schedule, request, or book.",
          "Estimate, booking, or appointment calls to action are weak or missing.",
          "Visitors need a clear next step. Without it, they may understand the business but still not reach out.",
          "Service descriptions explain what you do; calls to action tell visitors what to do next.",
          "Add direct buttons or text such as request an estimate, schedule a consultation, or book an appointment."
        ),
        evidence(
          signals.contactLinks.length > 0,
          "Easy contact path",
          "Contact path is easy to find.",
          "We found a contact, quote, estimate, appointment, or booking path.",
          "Contact page or booking path is hard to find.",
          "If visitors cannot quickly find how to contact the business, some will leave even if they like what they see.",
          "A phone number helps, but a clear contact path gives visitors a dedicated place to act.",
          "Keep Contact, Book, Schedule, or Request Estimate visible in the main navigation."
        )
      ],
      reviewedPages
    ),
    buildCategory(
      "trustSignals",
      evidenceQuality.confidence,
      [
        evidence(
          signals.testimonialMentions.length > 0,
          "Testimonials",
          "Testimonials are mentioned.",
          "We found testimonial language that can help visitors trust the business.",
          "Testimonials were not found.",
          "Visitors want proof from people like them before they contact a local business.",
          "An about page introduces the business; testimonials show how customers experienced it.",
          "Add short testimonials near service and contact sections.",
          { missingDetails: testimonialReview }
        ),
        evidence(
          signals.reviewMentions.length > 0,
          "Reviews or ratings",
          "Reviews or ratings are mentioned.",
          "We found review or rating language.",
          "Reviews were not found.",
          "Reviews reduce perceived risk and help visitors feel safer reaching out.",
          "Testimonials are curated proof; reviews are often seen as broader social proof.",
          "Add review snippets or link to review profiles where appropriate."
        ),
        evidence(
          signals.photoSignals.length > 0,
          "Real photos",
          "Real-photo signals were found.",
          "We found image signals that appear related to the team, owner, projects, or gallery.",
          "Real team, owner, project, or gallery photos were not clear.",
          "Real photos help visitors feel the business is legitimate and local, not generic.",
          "A polished design helps, but real photos create human trust.",
          "Add real team, owner, location, project, or before-and-after photos."
        ),
        evidence(
          signals.aboutPageUrls.length > 0,
          "About, team, or owner page",
          "About, team, or owner page was found.",
          "We found a page that appears to introduce the business, team, or owner.",
          "About, team, or owner page was not found.",
          "Local customers often want to know who they are inviting into their home, project, or decision process.",
          "Service pages explain the offer; about pages create personal confidence.",
          "Add an about, team, or owner page with local background and credibility."
        ),
        evidence(
          signals.certificationMentions.length > 0,
          "Credentials or awards",
          "Licenses, certifications, insurance, or awards are mentioned.",
          "We found language about licenses, certifications, insurance, accreditation, or awards.",
          "Licenses, certifications, insurance, or awards were not found.",
          "Credentials help customers reduce risk when comparing local providers.",
          "Experience claims help, but verifiable credentials are a different trust signal.",
          "Add relevant licenses, insurance, certifications, awards, or affiliations where accurate."
        ),
        evidence(
          signals.yearsInBusinessMentions.length > 0,
          "Years in business",
          "Years in business is mentioned.",
          "We found a years-in-business claim.",
          "Years in business was not found.",
          "Longevity can reassure visitors that the business is stable and experienced.",
          "A founder story may imply experience; a clear years-in-business statement makes it easier to understand quickly.",
          "Add a specific years-in-business or founded-year statement if accurate."
        ),
        evidence(
          signals.caseStudyMentions.length > 0,
          "Case studies or before/after examples",
          "Case study or before/after language was found.",
          "We found case study, project, or before-and-after language.",
          "Case studies or before/after examples were not found.",
          "Examples help visitors picture the result they might get from hiring the business.",
          "Testimonials say customers were happy; examples show the work or outcome.",
          "Add project examples, before-and-after stories, or simple case studies."
        )
      ],
      reviewedPages
    ),
    buildCategory(
      "messageClarity",
      evidenceQuality.confidence,
      [
        evidence(
          signals.serviceDescriptions.length > 0,
          "Service description",
          "The site describes services.",
          "We found service language that explains what the business offers.",
          "The service description is not clear enough.",
          "Visitors need to know quickly whether the business solves their specific problem.",
          "A business name or category may hint at services; this check looks for plain service descriptions.",
          "Make core services explicit in headings, body copy, and service sections."
        ),
        evidence(
          signals.cityOrServiceAreaMentions.length > 0,
          "Service area clarity",
          "The service area is described.",
          "We found language explaining where the business works.",
          "The service area is unclear.",
          "Visitors should not have to guess whether they are in range.",
          "A contact address can help, but service area language tells customers where the business accepts work.",
          "State the cities, counties, neighborhoods, or regions served."
        ),
        evidence(
          signals.customerTypeMentions.length > 0,
          "Customer type",
          "The customer type is described.",
          "We found language describing who the business serves.",
          "The ideal customer type is unclear.",
          "Visitors convert faster when they recognize themselves in the messaging.",
          "Service lists say what is offered; customer-type language says who it is for.",
          "Name the customer types the business wants more of, such as homeowners, families, businesses, or property owners."
        ),
        evidence(
          signals.differentiationMentions.length > 0,
          "Reason to choose the business",
          "Differentiators are mentioned.",
          "We found language that helps explain why someone should choose this business.",
          "The site does not clearly say why to choose this business.",
          "When local options look similar, visitors need a reason to prefer one provider.",
          "Basic service information says what you do; differentiation says why you are the right choice.",
          "Add specific differentiators such as speed, specialization, guarantee, local ownership, process, or proof."
        )
      ],
      reviewedPages
    ),
    buildCategory(
      "mobileExperience",
      evidenceQuality.confidence,
      [
        evidence(
          signals.mobileViewportFound,
          "Mobile-friendly page setup",
          "Mobile viewport tag was found.",
          "We found a mobile viewport setting that helps pages fit phone screens.",
          "Mobile-friendly viewport setup was not found.",
          "Most local visitors browse on phones. If the page is hard to read or use, fewer visitors will call or book.",
          "A site may look fine on desktop; this check looks for a basic mobile signal.",
          "Add a proper mobile viewport setting and review key pages on a phone."
        ),
        evidence(
          signals.phoneNumbers.length > 0 || signals.clickToCallLinks.length > 0,
          "Mobile contact access",
          "Contact details appear available for mobile visitors.",
          "We found phone or call-link evidence that can help mobile visitors contact the business.",
          "Mobile visitors may struggle to contact the business quickly.",
          "Phone users need contact actions they can see and use without hunting.",
          "A contact page is useful, but mobile visitors often need contact options visible sooner.",
          "Keep call, booking, or contact actions visible near the top of mobile pages."
        ),
        evidence(
          signals.pages.some((page) => page.forms > 0),
          "Mobile form path",
          "A form appears available.",
          "We found a form path that visitors may use to request help.",
          "No form was found to review for mobile usability.",
          "Forms can capture leads from visitors who cannot call immediately.",
          "A phone number supports calls; a simple form supports after-hours and detail-heavy requests.",
          "Add or simplify a mobile-friendly contact, estimate, or appointment form."
        )
      ],
      reviewedPages
    ),
    buildCategory(
      "aiDiscoverability",
      evidenceQuality.confidence,
      [
        evidence(
          signals.faqSignals.length > 0,
          "FAQ or question content",
          "FAQ or question-style content was found.",
          "We found FAQ or question-style content.",
          "FAQ content was not found.",
          "Clear answers help AI assistants and search systems understand when to recommend the business.",
          "Service pages explain offerings; FAQs answer the questions customers and AI tools ask.",
          "Add concise FAQs about services, pricing factors, timing, service area, and fit."
        ),
        evidence(
          signals.serviceDescriptions.length > 0,
          "Specific service descriptions",
          "Service descriptions were found.",
          "We found service descriptions that help explain what the business does.",
          "Specific service descriptions are missing.",
          "AI systems need specific service language to understand which customer problems the business solves.",
          "A broad category is not the same as detailed service descriptions.",
          "Write specific service sections that describe each core offer in plain language."
        ),
        evidence(
          signals.structuredContentSignals.length > 0,
          "Structured service or location content",
          "Structured service or location content was found.",
          "We found content that appears organized around services, locations, or process.",
          "Structured service or location content is thin.",
          "Organized pages and sections make it easier for visitors, search engines, and AI systems to understand the business.",
          "Some service text may exist, but structured sections make the information easier to interpret and reuse.",
          "Group content into clear service, location, FAQ, and process sections."
        ),
        evidence(
          signals.locationPageUrls.length > 0,
          "Crawlable location or service-area pages",
          foundWithExamples(
            "Crawlable service-area or location pages were found.",
            signals.locationPageUrls
          ),
          foundWithExamples(
            "We found location or service-area pages the crawler could access.",
            signals.locationPageUrls
          ),
          "Crawlable service-area or location pages were not found.",
          "Crawlable local pages help discovery systems understand where the business should appear.",
          "A single mention of a city helps less than a crawlable page focused on that market.",
          "Create crawlable pages for priority service areas or locations.",
          { missingDetails: locationReview }
        )
      ],
      reviewedPages
    ),
    pagespeed.status === "success"
      ? buildMeasuredPerformanceCategory(pagespeed)
      : buildUnavailableCategory(
          "performance",
          [
            evidence(
              false,
              "Performance measurement",
              "Performance measurement was available.",
              "We were able to measure performance during this assessment.",
              pagespeed.explanation,
              "We were unable to evaluate website performance because performance measurement was not available during this assessment. Performance was not included in the overall score.",
              "A site can have strong content and still lose visitors if pages load slowly; performance is a separate visitor-experience signal.",
              "Run a mobile performance test when measurement is available and improve slow-loading pages that hide contact actions."
            )
          ],
          reviewedPages
        ),
    buildCategory(
      "securityReliability",
      evidenceQuality.confidence,
      [
        evidence(
          signals.https,
          "HTTPS",
          "The submitted website uses HTTPS.",
          "We found that the submitted website uses HTTPS.",
          "The submitted website does not use HTTPS.",
          "HTTPS helps visitors and browsers trust that the website connection is legitimate.",
          "Good content does not replace a secure browser connection.",
          "Enable HTTPS and redirect visitors to the secure version of the site."
        ),
        evidence(
          signals.brokenLinks.length === 0,
          "Broken internal links",
          "No broken internal links were found in passive checks.",
          "We did not find broken internal links during passive checks.",
          "Broken internal links were found.",
          "Broken links create dead ends that can stop visitors before they contact the business.",
          "A strong homepage can still lose leads if important paths break.",
          "Fix or remove broken internal links on key pages.",
          {
            foundDetails: [`Checked internal links found on crawled pages.`],
            missingDetails: brokenAssetDetails(signals.brokenLinks)
          }
        ),
        evidence(
          signals.brokenImages.length === 0,
          "Broken internal images",
          "No broken internal images were found in passive checks.",
          "We did not find broken internal images during passive checks.",
          "Broken internal images were found.",
          "Broken images make the business look less maintained and can weaken trust.",
          "Written content may still be useful, but broken visuals can reduce confidence.",
          "Replace missing image files or remove broken image references.",
          {
            foundDetails: [`Checked internal images found on crawled pages.`],
            missingDetails: brokenAssetDetails(signals.brokenImages)
          }
        ),
        evidence(
          signals.sitemapFound,
          "Sitemap",
          "sitemap.xml was found.",
          "We found a sitemap file that can help crawlers discover public pages.",
          "sitemap.xml was not found.",
          "A sitemap helps search systems find important pages more reliably.",
          "Navigation links help humans; a sitemap helps crawlers discover the site structure.",
          "Create and submit a sitemap that includes important public pages."
        ),
        evidence(
          signals.faviconFound,
          "Site icon",
          "Favicon or site icon was found.",
          "We found a favicon or site icon.",
          "Favicon was not found.",
          "A site icon helps the website look polished in browser tabs, search results, and shared links.",
          "Branding on the page helps visitors; a favicon helps recognition in browser and search surfaces.",
          "Add a favicon or site icon."
        ),
        evidence(
          signals.openGraphImageFound,
          "Social sharing image",
          "Open Graph image was found.",
          "We found an Open Graph image for shared links.",
          "Open Graph image was not found.",
          "Shared links look more credible and clickable when they include a relevant image.",
          "Images on the page help visitors already on the site; Open Graph images help before visitors click.",
          "Add an Open Graph image for the homepage and key service pages."
        )
      ],
      reviewedPages
    )
  ];
}

function buildCategory(
  category: ScoringCategory,
  confidence: CategoryAssessment["scoreExplanation"]["confidence"],
  checks: Array<{
    passed: boolean;
    check: string;
    found: string;
    foundExplanation: string;
    foundDetails: string[];
    missing: string;
    missingExplanation: string;
    missingDetails: string[];
    existingContentNote: string;
    recommendedAction: string;
  }>,
  defaultEvidenceDetails: string[] = []
): CategoryAssessment {
  const passed = checks.filter((check) => check.passed);
  const failed = checks.filter((check) => !check.passed);
  const score = Math.round((passed.length / checks.length) * 100);
  const weight = scoringWeights[category];
  const weightedContribution = Math.round((score * weight) / 100);
  const factorImpact = Math.round(100 / checks.length);
  const factors = checks.map((check) => ({
    label: check.passed ? check.found : check.missing,
    passed: check.passed,
    evidence: check.passed ? check.found : check.missing,
    evidenceDetails: check.passed
      ? check.foundDetails
      : check.missingDetails.length > 0
        ? check.missingDetails
        : defaultEvidenceDetails,
    check: check.check,
    businessExplanation: check.passed
      ? check.foundExplanation
      : check.missingExplanation,
    existingContentNote: check.existingContentNote,
    recommendedAction: check.recommendedAction,
    scoreImpact: factorImpact
  }));

  return {
    category,
    label: scoringCategoryLabels[category],
    weight,
    scoreStatus: "scored",
    score,
    factors,
    scoreExplanation: {
      formula: `${passed.length} of ${checks.length} factors passed = ${score}/100. Category weight: ${weight}%. Weighted contribution: ${weightedContribution} points.`,
      passedFactors: passed.length,
      totalFactors: checks.length,
      weightedContribution,
      confidence,
      summary: `${scoringCategoryLabels[category]} scored ${score}/100 because ${passed.length} of ${checks.length} evidence checks passed.`
    },
    evidenceFound: passed.map((check) => check.found),
    evidenceMissing: failed.map((check) => check.missing),
    businessImpact: businessImpactFor(category, score),
    recommendedFix: recommendedFixFor(category)
  };
}

function buildMeasuredPerformanceCategory(
  pagespeed: CrawlMetadata["pagespeed"]
): CategoryAssessment {
  const score = pagespeed.mobilePerformanceScore ?? 0;
  const weight = scoringWeights.performance;
  const weightedContribution = Math.round((score * weight) / 100);
  const isGood = score >= 90;
  const evidenceText = `PageSpeed mobile score was ${score}.`;
  const factor = {
    label: isGood
      ? evidenceText
      : `Mobile PageSpeed score was ${score}, below the recommended good range.`,
    passed: isGood,
    evidence: isGood
      ? evidenceText
      : `Mobile PageSpeed score was ${score}, below the recommended good range.`,
    evidenceDetails: [
      `Measured by Google PageSpeed Insights API for ${pagespeed.mobilePerformanceScore}/100 mobile performance.`,
      pagespeed.explanation
    ],
    check: "Mobile PageSpeed score",
    businessExplanation: isGood
      ? `We measured mobile performance and received a strong score of ${score}/100.`
      : `We measured mobile performance and received a score of ${score}/100. This suggests some mobile visitors may wait longer than they should before they can read the page or find contact options.`,
    existingContentNote:
      "A site can have strong content and still lose visitors if pages load slowly; performance is a separate visitor-experience signal.",
    recommendedAction: isGood
      ? "Keep monitoring mobile performance as pages and tracking scripts change."
      : "Improve the slowest mobile-loading pages first, especially pages where visitors need to call, book, or request an estimate.",
    scoreImpact: Math.max(0, 100 - score)
  };

  return {
    category: "performance",
    label: scoringCategoryLabels.performance,
    weight,
    scoreStatus: "scored",
    score,
    factors: [factor],
    scoreExplanation: {
      formula: `PageSpeed mobile performance score = ${score}/100. Category weight: ${weight}%. Weighted contribution: ${weightedContribution} points.`,
      passedFactors: isGood ? 1 : 0,
      totalFactors: 1,
      weightedContribution,
      confidence: "medium",
      summary: `Performance scored ${score}/100 from the measured PageSpeed mobile score.`
    },
    evidenceFound: [evidenceText],
    evidenceMissing: isGood
      ? []
      : [`Mobile PageSpeed score was ${score}, below the recommended good range.`],
    businessImpact: businessImpactFor("performance", score),
    recommendedFix: recommendedFixFor("performance")
  };
}

function buildUnavailableCategory(
  category: ScoringCategory,
  checks: Array<{
    passed: boolean;
    check: string;
    found: string;
    foundExplanation: string;
    foundDetails: string[];
    missing: string;
    missingExplanation: string;
    missingDetails: string[];
    existingContentNote: string;
    recommendedAction: string;
  }>,
  defaultEvidenceDetails: string[] = []
): CategoryAssessment {
  const base = buildCategory(category, "low", checks, defaultEvidenceDetails);
  return {
    ...base,
    scoreStatus: "unavailable",
    score: 0,
    scoreExplanation: {
      ...base.scoreExplanation,
      formula: `${scoringCategoryLabels[category]} was not included in the overall score because required measurement was unavailable.`,
      weightedContribution: 0,
      summary: `${scoringCategoryLabels[category]} was not scored because measurement was unavailable.`
    },
    businessImpact:
      "Performance can affect whether mobile visitors stay long enough to contact the business, but this assessment could not measure it.",
    recommendedFix:
      "Run a mobile performance measurement when the external service is available, then improve slow-loading pages if issues are confirmed."
  };
}

function evaluateEvidenceQuality(crawl: {
  pages: CrawledPage[];
  skippedUrls: Array<{ url: string; reason: string }>;
  adapterFailures: Array<{ url: string; operation: string; message: string }>;
}):
  | { assessmentStatus: "insufficient"; summary: string }
  | { assessmentStatus: "sufficient"; reportQuality: EvidenceQuality } {
  const readablePages = crawl.pages.filter(
    (page) => page.status < 400 && page.text.trim().length > 0
  );
  const meaningfulPages = readablePages.filter(
    (page) => page.text.trim().length >= 200
  );
  const totalTextCharacters = readablePages.reduce(
    (total, page) => total + page.text.trim().length,
    0
  );

  if (crawl.pages.length === 0) {
    const failureReasons = crawl.adapterFailures
      .map((failure) => `${failure.operation}: ${failure.message}`)
      .concat(crawl.skippedUrls.map((skipped) => skipped.reason));
    return {
      assessmentStatus: "insufficient",
      summary:
        failureReasons.length > 0
          ? redactSecrets(
              `The assessment could not collect enough public website evidence to score this site. No public HTML pages were crawled. Observed issue: ${unique(failureReasons)[0]}.`
            )
          : "The assessment could not collect enough public website evidence to score this site. No public HTML pages were crawled."
    };
  }

  if (meaningfulPages.length === 0) {
    return {
      assessmentStatus: "insufficient",
      summary:
        "The assessment reached the website but could not extract enough readable public page text to support a trustworthy report."
    };
  }

  if (totalTextCharacters < 300) {
    return {
      assessmentStatus: "insufficient",
      summary:
        "The assessment reached the website but extracted too little readable public page text to support a trustworthy scored report."
    };
  }

  const limitations: string[] = [];
  if (meaningfulPages.length < 2) {
    limitations.push("Only one meaningful public page was available for scoring.");
  }
  if (totalTextCharacters < 1000) {
    limitations.push("The crawler extracted a limited amount of readable page text.");
  }
  if (crawl.adapterFailures.length > 0) {
    limitations.push("Some public requests failed during the assessment.");
  }

  const confidence: EvidenceQuality["confidence"] =
    limitations.length === 0 ? "high" : totalTextCharacters >= 500 ? "medium" : "low";
  const assessmentStatus: EvidenceQuality["assessmentStatus"] =
    limitations.length === 0 ? "successful" : "partial";

  return {
    assessmentStatus: "sufficient",
    reportQuality: {
      assessmentStatus,
      confidence,
      pagesWithReadableText: readablePages.length,
      meaningfulPages: meaningfulPages.length,
      totalTextCharacters,
      summary:
        assessmentStatus === "successful"
          ? "The assessment collected enough public website evidence to support the report."
          : "The assessment collected some useful public website evidence, but conclusions should be read with the listed limitations.",
      limitations
    }
  };
}

function evidence(
  passed: boolean,
  check: string,
  found: string,
  foundExplanation: string,
  missing: string,
  missingExplanation: string,
  existingContentNote: string,
  recommendedAction: string,
  details: { foundDetails?: string[]; missingDetails?: string[] } = {}
) {
  return {
    passed,
    check,
    found,
    foundExplanation,
    foundDetails: details.foundDetails ?? [],
    missing,
    missingExplanation,
    missingDetails: details.missingDetails ?? [],
    existingContentNote,
    recommendedAction
  };
}

function pagesCheckedDetails(pages: CrawledPage[]): string[] {
  const reviewed = pages
    .filter((page) => page.status < 400)
    .slice(0, 8)
    .map((page) => {
      const title = page.title ? ` (${page.title})` : "";
      return `${page.url}${title}`;
    });

  if (reviewed.length === 0) {
    return ["Pages checked: no successful public HTML pages were available."];
  }

  return [`Pages checked: ${reviewed.join("; ")}.`];
}

function phoneEvidenceDetails(signals: ExtractedSignals): string[] {
  return pagesCheckedDetails(signals.pages).concat([
    `Visible phone-like text found: ${signals.phoneNumbers.length > 0 ? unique(signals.phoneNumbers).slice(0, 6).join(", ") : "none"}.`,
    `tel: links found: ${signals.clickToCallLinks.length > 0 ? unique(signals.clickToCallLinks).slice(0, 6).join(", ") : "none"}.`
  ]);
}

function locationEvidenceDetails(signals: ExtractedSignals): string[] {
  return signalEvidenceDetails(
    pagesCheckedDetails(signals.pages),
    "Location or service-area candidate links found",
    signals.locationPageUrls
  ).concat(
    `Service-area language found: ${
      signals.cityOrServiceAreaMentions.length > 0
        ? unique(signals.cityOrServiceAreaMentions).slice(0, 6).join(", ")
        : "none"
    }.`
  );
}

function testimonialEvidenceDetails(signals: ExtractedSignals): string[] {
  return signalEvidenceDetails(
    pagesCheckedDetails(signals.pages),
    "Review or rating evidence found",
    signals.reviewMentions
  ).concat([
    `Testimonial-specific evidence found: ${signals.testimonialMentions.length > 0 ? unique(signals.testimonialMentions).slice(0, 6).join(", ") : "none"}.`,
    "Testimonials are customer stories or quoted customer proof. Reviews and star ratings are related trust signals, but this check looks for testimonial-like customer-story evidence."
  ]);
}

function signalEvidenceDetails(
  baseDetails: string[],
  label: string,
  values: string[]
): string[] {
  return baseDetails.concat(
    `${label}: ${values.length > 0 ? unique(values).slice(0, 8).join(", ") : "none"}.`
  );
}

function brokenAssetDetails(assets: ExtractedSignals["brokenLinks"]): string[] {
  if (assets.length === 0) {
    return ["No broken internal assets were recorded during passive checks."];
  }

  return assets.slice(0, 10).map((asset) => {
    const label =
      asset.kind === "image"
        ? `alt text: ${asset.alt || "not available"}`
        : `link label: ${asset.label || "not available"}`;
    const status =
      asset.status !== undefined
        ? `response code: ${asset.status}`
        : `issue: ${asset.reason || "request failed"}`;
    return `Source page: ${asset.sourcePage}; ${asset.kind === "image" ? "image URL" : "destination URL"}: ${asset.url}; ${status}; ${label}.`;
  });
}

function foundWithExamples(base: string, values: string[]): string {
  const examples = unique(values).slice(0, 6);
  if (examples.length === 0) return base;
  return `${base} Examples found: ${examples.join(", ")}.`;
}

function businessImpactFor(category: ScoringCategory, score: number): string {
  const subject: Record<ScoringCategory, string> = {
    localVisibility: "local visibility signals",
    leadConversion: "lead conversion signals",
    trustSignals: "trust signals",
    messageClarity: "message clarity signals",
    mobileExperience: "mobile experience signals",
    aiDiscoverability: "AI discoverability signals",
    performance: "performance signals",
    securityReliability: "security and reliability signals"
  };
  if (score >= 80) {
    return `Your ${subject[category]} are helping visitors understand and trust the business.`;
  }
  if (score >= 50) {
    return `Your ${subject[category]} are partly working, but some visitors may still hesitate before contacting you.`;
  }
  return `Weak ${subject[category]} can cause local visitors to leave before they feel ready to call, book, or request an estimate.`;
}

function recommendedFixFor(category: ScoringCategory): string {
  const fixes: Record<ScoringCategory, string> = {
    localVisibility:
      "Make the business name, phone number, service area, location pages, and Google profile connection clear on key pages.",
    leadConversion:
      "Put a visible phone number, click-to-call action, contact form, and estimate or appointment CTA near the top of important pages.",
    trustSignals:
      "Add proof that feels real: reviews, testimonials, team or project photos, licenses, years in business, and before/after examples.",
    messageClarity:
      "Say exactly what you do, who you help, where you work, and why a local customer should choose you.",
    mobileExperience:
      "Make the mobile page easy to read and keep call, booking, and contact actions visible without pinching or hunting.",
    aiDiscoverability:
      "Add clear service pages, service-area pages, FAQs, and specific answers that explain when and why customers hire you.",
    performance:
      "Keep the homepage fast enough that mobile visitors can see what you do and how to contact you without waiting.",
    securityReliability:
      "Fix broken links and missing site basics so visitors and search engines see a reliable business presence."
  };
  return fixes[category];
}

function weightedOverallScore(categories: CategoryAssessment[]): number {
  const scored = categories.filter(
    (category) => category.scoreStatus !== "unavailable"
  );
  const weightTotal = scored.reduce(
    (total, category) => total + scoringWeights[category.category],
    0
  );
  if (weightTotal === 0) return 0;
  const weighted = scored.reduce(
    (total, category) => total + category.score * scoringWeights[category.category],
    0
  );
  return Math.round(weighted / weightTotal);
}

async function runPageSpeed(
  url: string,
  options: AssessWebsiteOptions & {
    requestTimeoutMs: number;
    pageSpeedTimeoutMs: number;
  }
): Promise<CrawlMetadata["pagespeed"]> {
  if (!options.pagespeedApiKey) {
    return {
      status: "skipped",
      explanation:
        "PageSpeed was skipped because no API key is configured. No performance score was invented."
    };
  }

  if (!options.pageSpeedAdapter) {
    return {
      status: "failed",
      explanation:
        "PageSpeed could not run because the PageSpeed adapter is not configured."
    };
  }

  try {
    const result = await withTimeout(
      options.pageSpeedAdapter({
        url,
        apiKey: options.pagespeedApiKey
      }),
      options.pageSpeedTimeoutMs,
      "PageSpeed request"
    );
    return {
      status: "success",
      explanation: result.summary,
      mobilePerformanceScore: result.mobilePerformanceScore
    };
  } catch (error) {
    emitAssessmentEvent(options.eventSink, {
      type: "pagespeed.failed",
      message:
        error instanceof Error ? error.message : "PageSpeed could not be reached.",
      url
    });
    return {
      status: "failed",
      explanation:
        "PageSpeed could not be reached, so the report does not make a performance claim from that API."
    };
  }
}

function emitAssessmentEvent(
  eventSink: AssessWebsiteOptions["eventSink"],
  event: AssessmentEvent
): void {
  if (!eventSink) return;

  eventSink({
    ...event,
    message: redactSecrets(event.message),
    url: event.url ? redactSecrets(event.url) : undefined,
    metadata: event.metadata
  });
}

async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  label: string
): Promise<T> {
  let timeoutTimer: ReturnType<typeof setTimeout> | undefined;

  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timeoutTimer = setTimeout(() => {
          reject(new Error(`${label} timed out after ${timeoutMs}ms`));
        }, timeoutMs);
      })
    ]);
  } finally {
    if (timeoutTimer) clearTimeout(timeoutTimer);
  }
}

async function fetchRobotsRules(
  url: URL,
  fetchAdapter: FetchAdapter,
  observability?: {
    requestTimeoutMs: number;
    maxResponseBytes: number;
    decisions: CrawlDecision[];
    adapterFailures: Array<{ url: string; operation: string; message: string }>;
  }
): Promise<RobotsRules> {
  const robotsUrl = new URL("/robots.txt", url.origin);
  try {
    const fetched = await safeFetch(fetchAdapter, robotsUrl.href, {
      method: "GET",
      requestTimeoutMs:
        observability?.requestTimeoutMs ?? crawlerPolicy.requestTimeoutMs
    });
    if (fetched.response.status >= 400) {
      observability?.decisions.push({
        url: robotsUrl.href,
        action: "skipped",
        reason: "robots.txt not found",
        method: "GET",
        status: fetched.response.status,
        durationMs: fetched.durationMs
      });
      return { found: false, disallow: [] };
    }
    const text = await readTextWithinLimit(
      fetched.response,
      observability?.maxResponseBytes ?? crawlerPolicy.maxResponseBytes
    );
    observability?.decisions.push({
      url: robotsUrl.href,
      action: "crawled",
      reason: text.truncated ? "robots.txt truncated at size limit" : "robots.txt read",
      method: "GET",
      status: fetched.response.status,
      durationMs: fetched.durationMs,
      bytesRead: text.bytesRead
    });
    return parseRobotsTxt(text.text);
  } catch (error) {
    observability?.adapterFailures.push({
      url: robotsUrl.href,
      operation: "robots.txt fetch",
      message:
        error instanceof Error ? error.message : "robots.txt could not be fetched"
    });
    return { found: false, disallow: [] };
  }
}

function parseRobotsTxt(content: string): RobotsRules {
  const disallow: string[] = [];
  let crawlDelayMs: number | undefined;
  let applies = false;

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.replace(/#.*/, "").trim();
    if (!line) continue;

    const [rawKey, ...rawValue] = line.split(":");
    const key = rawKey?.trim().toLowerCase();
    const value = rawValue.join(":").trim();

    if (key === "user-agent") {
      const agent = value.toLowerCase();
      applies =
        agent === "*" ||
        crawlerPolicy.userAgent.toLowerCase().includes(agent) ||
        agent.includes("northvalleyintelwebsiteassessmentbot");
    }

    if (applies && key === "disallow" && value) {
      disallow.push(value);
    }

    if (applies && key === "crawl-delay") {
      const seconds = Number(value);
      if (Number.isFinite(seconds) && seconds > 0) {
        crawlDelayMs = seconds * 1000;
      }
    }
  }

  return { found: true, disallow, crawlDelayMs };
}

function crawlSkipReason(
  url: URL,
  startedUrl: URL,
  robots: RobotsRules,
  depth: number
): string | null {
  if (!isAllowedSubmittedDomainVariant(url, startedUrl)) {
    return "outside submitted domain";
  }
  if (depth > crawlerPolicy.maxDepth) return "exceeds max crawl depth";
  if (privatePathPattern.test(url.pathname)) return "private or admin path skipped";
  if (robots.disallow.some((rule) => rule !== "/" && url.pathname.startsWith(rule))) {
    return "blocked by robots.txt";
  }
  if (robots.disallow.includes("/")) return "blocked by robots.txt";
  return null;
}

function isAllowedSubmittedDomainVariant(url: URL, startedUrl: URL): boolean {
  return canonicalHostname(url.hostname) === canonicalHostname(startedUrl.hostname);
}

function canonicalHostname(hostname: string): string {
  return hostname.toLowerCase().replace(/^www\./, "");
}

function parsePage(
  url: string,
  status: number,
  html: string,
  readResult: { bytesRead: number; truncated: boolean }
): CrawledPage {
  const title = firstMatch(html, /<title[^>]*>([\s\S]*?)<\/title>/i);
  const metaDescription = firstMatch(
    html,
    /<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["'][^>]*>/i
  );
  const links = collectAttributes(html, "a", "href");
  const linkDetails = collectLinkDetails(html);
  const images = collectAttributes(html, "img", "src");
  const imageDetails = collectImageDetails(html);
  const text = htmlToSearchableText(html);

  return {
    url,
    status,
    title,
    metaDescription,
    text,
    links,
    linkDetails,
    images,
    imageDetails,
    forms: (html.match(/<form\b/gi) ?? []).length,
    bytesRead: readResult.bytesRead,
    truncated: readResult.truncated,
    mobileViewportFound: /<meta[^>]+name=["']viewport["'][^>]*>/i.test(html),
    openGraphImageFound: /<meta[^>]+property=["']og:image["'][^>]*>/i.test(html),
    localBusinessSchemaFound: /"@type"\s*:\s*"[^"]*LocalBusiness|LocalBusiness/i.test(
      html
    )
  };
}

function collectAttributes(html: string, tagName: string, attribute: string): string[] {
  const values: string[] = [];
  const pattern = new RegExp(
    `<${tagName}\\b[^>]*\\s${attribute}=["']([^"']+)["'][^>]*>`,
    "gi"
  );
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(html)) !== null) {
    if (match[1]) values.push(decodeHtmlAttribute(match[1]));
  }
  return unique(values);
}

function collectLinkDetails(html: string): Array<{ href: string; label: string }> {
  const details: Array<{ href: string; label: string }> = [];
  const pattern = /<a\b([^>]*)>([\s\S]*?)<\/a>/gi;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(html)) !== null) {
    const href = decodeHtmlAttribute(
      firstMatch(match[1] ?? "", /\bhref=["']([^"']+)["']/i)
    );
    if (!href) continue;
    const ariaLabel = firstMatch(match[1] ?? "", /\baria-label=["']([^"']+)["']/i);
    const label = htmlToSearchableText(match[2] ?? "") || ariaLabel;
    details.push({ href, label });
  }
  return uniqueBy(details, (detail) => `${detail.href}|${detail.label}`);
}

function collectImageDetails(html: string): Array<{ src: string; alt: string }> {
  const details: Array<{ src: string; alt: string }> = [];
  const pattern = /<img\b([^>]*)>/gi;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(html)) !== null) {
    const attributes = match[1] ?? "";
    const src = decodeHtmlAttribute(firstMatch(attributes, /\bsrc=["']([^"']+)["']/i));
    if (!src) continue;
    const alt = firstMatch(attributes, /\balt=["']([^"']*)["']/i);
    details.push({ src, alt });
  }
  return uniqueBy(details, (detail) => `${detail.src}|${detail.alt}`);
}

function htmlToSearchableText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function decodeHtmlAttribute(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function firstMatch(value: string, pattern: RegExp): string {
  return pattern.exec(value)?.[1]?.trim() ?? "";
}

function findMatches(text: string, phrases: string[]): string[] {
  const normalized = text.toLowerCase();
  return phrases.filter((phrase) => normalized.includes(phrase.toLowerCase()));
}

function detectTestimonialSignals(text: string): string[] {
  const directSignals = findMatches(text, [
    "testimonial",
    "testimonials",
    "happy customer"
  ]);
  const reviewContext = findMatches(text, [
    "client reviews",
    "customer reviews",
    "review card",
    "reseñas de clientes",
    "reviews"
  ]);
  const customerStorySignals = findMatches(text, [
    "i recommend",
    "highly recommend",
    "recommend her",
    "recommend rosa",
    "recommended her",
    "amazing job",
    "great job",
    "professional",
    "cleaning my home",
    "cleaning person for years",
    "years now",
    "years to come",
    "recomiendo"
  ]);

  if (reviewContext.length === 0 || customerStorySignals.length === 0) {
    return directSignals;
  }

  return unique(
    directSignals.concat(reviewContext.slice(0, 2), customerStorySignals.slice(0, 4))
  );
}

function toAbsoluteUrl(value: string, baseUrl: URL): URL | null {
  try {
    if (
      value.startsWith("mailto:") ||
      value.startsWith("tel:") ||
      value.startsWith("#")
    ) {
      return null;
    }
    const url = new URL(value, baseUrl);
    url.hash = "";
    return url;
  } catch {
    return null;
  }
}

function normalizeUrl(url: URL): string {
  const copy = new URL(url.href);
  copy.hash = "";
  if (copy.pathname.endsWith("/") && copy.pathname !== "/") {
    copy.pathname = copy.pathname.slice(0, -1);
  }
  return copy.href;
}

async function checkBrokenAssets(
  startedUrl: URL,
  values: Array<{ value: string; sourcePage: string; label?: string; alt?: string }>,
  fetchAdapter: FetchAdapter,
  kind: "link" | "image",
  options: { requestTimeoutMs?: number } = {}
): Promise<ExtractedSignals["brokenLinks"]> {
  const broken: ExtractedSignals["brokenLinks"] = [];
  const candidates = uniqueBy(
    values
      .map((value) => {
        const sourceUrl = toAbsoluteUrl(value.sourcePage, startedUrl) ?? startedUrl;
        const url = toAbsoluteUrl(value.value, sourceUrl);
        return url ? { ...value, url } : null;
      })
      .filter((value): value is NonNullable<typeof value> => value !== null)
      .filter(
        (candidate) =>
          canonicalHostname(candidate.url.hostname) ===
          canonicalHostname(startedUrl.hostname)
      )
      .filter((candidate) => !privatePathPattern.test(candidate.url.pathname)),
    (candidate) => candidate.url.href
  ).slice(0, 25);
  const assetTimeoutMs = Math.min(
    options.requestTimeoutMs ?? crawlerPolicy.requestTimeoutMs,
    3000
  );

  for (const candidate of candidates) {
    try {
      const fetched = await safeFetch(fetchAdapter, candidate.url.href, {
        method: "HEAD",
        requestTimeoutMs: assetTimeoutMs
      });
      if (fetched.response.status >= 400) {
        broken.push({
          kind,
          sourcePage: candidate.sourcePage,
          url: candidate.url.href,
          status: fetched.response.status,
          label: candidate.label,
          alt: candidate.alt
        });
      }
    } catch (error) {
      broken.push({
        kind,
        sourcePage: candidate.sourcePage,
        url: candidate.url.href,
        label: candidate.label,
        alt: candidate.alt,
        reason: error instanceof Error ? error.message : "request failed"
      });
    }
  }

  return uniqueBy(
    broken,
    (asset) =>
      `${asset.kind}|${asset.sourcePage}|${asset.url}|${asset.status ?? ""}|${asset.reason ?? ""}`
  );
}

async function sitemapExists(
  startedUrl: URL,
  fetchAdapter: FetchAdapter
): Promise<boolean> {
  try {
    const fetched = await safeFetch(
      fetchAdapter,
      new URL("/sitemap.xml", startedUrl.origin).href,
      {
        method: "HEAD",
        requestTimeoutMs: crawlerPolicy.requestTimeoutMs
      }
    );
    return fetched.response.status < 400;
  } catch {
    return false;
  }
}

async function safeFetch(
  fetchAdapter: FetchAdapter,
  url: string,
  options: { method: "GET" | "HEAD"; requestTimeoutMs: number }
): Promise<{ response: FetchResponse; durationMs: number }> {
  const startedAt = Date.now();
  const controller = new AbortController();
  const abortTimer = setTimeout(() => controller.abort(), options.requestTimeoutMs);
  let timeoutTimer: ReturnType<typeof setTimeout> | undefined;

  try {
    const response = await Promise.race([
      fetchAdapter(url, {
        method: options.method,
        headers: { "user-agent": crawlerPolicy.userAgent },
        signal: controller.signal
      }),
      new Promise<never>((_, reject) => {
        timeoutTimer = setTimeout(() => {
          reject(new Error(`request timed out after ${options.requestTimeoutMs}ms`));
        }, options.requestTimeoutMs);
      })
    ]);

    return { response, durationMs: Date.now() - startedAt };
  } finally {
    clearTimeout(abortTimer);
    if (timeoutTimer) clearTimeout(timeoutTimer);
  }
}

async function readTextWithinLimit(
  response: FetchResponse,
  maxResponseBytes: number
): Promise<{ text: string; bytesRead: number; truncated: boolean }> {
  const text = await response.text();
  const bytesRead = Buffer.byteLength(text, "utf8");

  if (bytesRead <= maxResponseBytes) {
    return { text, bytesRead, truncated: false };
  }

  return {
    text: Buffer.from(text, "utf8").subarray(0, maxResponseBytes).toString("utf8"),
    bytesRead,
    truncated: true
  };
}

function collectSecurityHeaders(pages: CrawledPage[]): string[] {
  return pages.length > 0 ? [] : [];
}

function buildExecutiveSummary(
  overallScore: number,
  weakest: CategoryAssessment[],
  strongest?: CategoryAssessment
): string {
  const weakLabels = weakest.map((category) => category.label).join(", ");
  const strongText = strongest ? ` The strongest area is ${strongest.label}.` : "";

  return `This website scored ${overallScore}/100 for local lead generation. The biggest opportunities are ${weakLabels}.${strongText}`;
}

function stableScanId(domain: string, createdAt: string): string {
  return `${domain.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-${Date.parse(createdAt)}`;
}

function unique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

function uniqueBy<T>(values: T[], keyFor: (value: T) => string): T[] {
  const seen = new Set<string>();
  const result: T[] = [];
  for (const value of values) {
    const key = keyFor(value);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    result.push(value);
  }
  return result;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function defaultFetchAdapter(url: string, init?: Parameters<FetchAdapter>[1]) {
  const response = await fetch(url, {
    method: init?.method ?? "GET",
    headers: init?.headers,
    signal: init?.signal
  });

  return {
    url: response.url,
    status: response.status,
    headers: response.headers,
    text: () => response.text()
  };
}

export const googlePageSpeedAdapter: PageSpeedAdapter = async ({ url, apiKey }) => {
  const endpoint = new URL(
    "https://www.googleapis.com/pagespeedonline/v5/runPagespeed"
  );
  endpoint.searchParams.set("url", url);
  endpoint.searchParams.set("strategy", "mobile");
  endpoint.searchParams.set("key", apiKey);

  const response = await fetch(endpoint);
  if (!response.ok) {
    throw new Error("PageSpeed request failed");
  }

  const payload = (await response.json()) as {
    lighthouseResult?: {
      categories?: {
        performance?: {
          score?: number;
        };
      };
    };
  };
  const score = payload.lighthouseResult?.categories?.performance?.score;

  if (typeof score !== "number") {
    throw new Error("PageSpeed response did not include a performance score");
  }

  const mobilePerformanceScore = Math.round(score * 100);

  return {
    mobilePerformanceScore,
    summary: `PageSpeed reported a mobile performance score of ${mobilePerformanceScore}/100.`
  };
};
