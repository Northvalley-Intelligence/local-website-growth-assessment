import { describe, expect, it } from "vitest";
import {
  assessWebsite,
  crawlWebsite,
  extractSignals,
  InsufficientEvidenceError,
  type FetchAdapter
} from "./index.js";

function response(
  url: string,
  status: number,
  body = "",
  contentType = "text/html",
  extraHeaders: Record<string, string> = {}
) {
  return {
    url,
    status,
    headers: {
      get(name: string) {
        const key = name.toLowerCase();
        if (key === "content-type") return contentType;
        const match = Object.entries(extraHeaders).find(
          ([headerName]) => headerName.toLowerCase() === key
        );
        return match ? match[1] : null;
      }
    },
    async text() {
      return body;
    }
  };
}

function mockedSite(
  pages: Record<string, string>,
  options: {
    robots?: string;
    broken?: string[];
    /** URLs whose fetch throws (network error/timeout), for "could not assess" fixtures. */
    unreachable?: string[];
    /** requested URL -> final URL, for redirect-chain fixtures (body is read from the final URL's key in `pages`). */
    redirects?: Record<string, string>;
    /** Extra response headers per URL (e.g. X-Robots-Tag), for indexability fixtures. */
    headers?: Record<string, Record<string, string>>;
  } = {}
) {
  const calls: Array<{ url: string; method: string }> = [];
  const broken = new Set(options.broken ?? []);
  const unreachable = new Set(options.unreachable ?? []);
  const redirects = options.redirects ?? {};
  const extraHeaders = options.headers ?? {};

  const fetchAdapter: FetchAdapter = async (url: string, init) => {
    const method = init?.method ?? "GET";
    calls.push({ url, method });

    if (unreachable.has(url)) {
      throw new Error("simulated network error");
    }

    if (url === "https://example.com/robots.txt") {
      return response(url, options.robots ? 200 : 404, options.robots ?? "");
    }

    if (url === "https://example.com/sitemap.xml") {
      return response(url, 200, "<urlset />", "application/xml", extraHeaders[url]);
    }

    if (method === "HEAD") {
      return response(
        url,
        broken.has(url) ? 404 : 200,
        "",
        "text/html",
        extraHeaders[url]
      );
    }

    const finalUrl = redirects[url] ?? url;
    const body = pages[finalUrl];
    if (!body) {
      return response(finalUrl, 404, "not found", "text/html", extraHeaders[finalUrl]);
    }
    return response(finalUrl, 200, body, "text/html", extraHeaders[finalUrl]);
  };

  return { fetchAdapter, calls };
}

describe("Phase 1 assessment pipeline", () => {
  it("respects robots.txt and does not crawl outside the submitted domain", async () => {
    const { fetchAdapter, calls } = mockedSite(
      {
        "https://example.com/": `
          <html><head><title>Example Local Services</title></head>
          <body>
            <a href="/allowed">Allowed</a>
            <a href="/blocked">Blocked</a>
            <a href="https://other.example/">External</a>
          </body></html>`,
        "https://example.com/allowed": "<html><body>Allowed page</body></html>"
      },
      { robots: "User-agent: *\nDisallow: /blocked" }
    );

    const crawl = await crawlWebsite(new URL("https://example.com/"), fetchAdapter, {
      crawlDelayMs: 0
    });

    expect(crawl.pages.map((page) => page.url)).toEqual([
      "https://example.com/",
      "https://example.com/allowed"
    ]);
    expect(crawl.skippedUrls).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          url: "https://example.com/blocked",
          reason: "blocked by robots.txt"
        }),
        expect.objectContaining({
          url: "https://other.example/",
          reason: "outside submitted domain"
        })
      ])
    );
    expect(calls.some((call) => call.url === "https://example.com/blocked")).toBe(
      false
    );
    expect(calls.some((call) => call.url === "https://other.example/")).toBe(false);
  });

  it("never submits forms and enforces max pages and depth", async () => {
    const pages: Record<string, string> = {
      "https://example.com/": `<html><body>
        <form action="/lead" method="post"><input name="email" /></form>
        ${Array.from({ length: 30 }, (_, index) => `<a href="/p${index}">p${index}</a>`).join("")}
      </body></html>`
    };

    for (let index = 0; index < 30; index += 1) {
      pages[`https://example.com/p${index}`] =
        `<html><body><a href="/deep/${index}">deep</a></body></html>`;
      pages[`https://example.com/deep/${index}`] = "<html><body>too deep</body></html>";
    }

    const { fetchAdapter, calls } = mockedSite(pages);
    const crawl = await crawlWebsite(new URL("https://example.com/"), fetchAdapter, {
      crawlDelayMs: 0
    });

    expect(crawl.pages).toHaveLength(25);
    expect(calls.some((call) => call.url === "https://example.com/lead")).toBe(false);
    expect(calls.every((call) => call.method === "GET")).toBe(true);
    expect(crawl.pages.some((page) => page.url.includes("/deep/"))).toBe(false);
  });

  it("supports a smaller production page budget for large public sites", async () => {
    const pages: Record<string, string> = {
      "https://example.com/": `<html><body>
        ${Array.from({ length: 20 }, (_, index) => `<a href="/city-${index}">city ${index}</a>`).join("")}
        <p>${"Local service details for homeowners. ".repeat(20)}</p>
      </body></html>`
    };

    for (let index = 0; index < 20; index += 1) {
      pages[`https://example.com/city-${index}`] =
        `<html><body><p>${"Detailed service-area content. ".repeat(20)}</p></body></html>`;
    }

    const { fetchAdapter } = mockedSite(pages);
    const report = await assessWebsite(
      { url: "https://example.com/" },
      {
        fetchAdapter,
        maxPages: 4,
        crawlDelayMs: 0,
        now: () => new Date("2026-06-10T12:00:00.000Z")
      }
    );

    expect(report.crawlMetadata.pagesCrawled).toBe(4);
    expect(report.crawlMetadata.maxPages).toBe(4);
    expect(report.evidenceQuality.assessmentStatus).toMatch(/successful|partial/);
  });

  it("returns a partial report when the crawl time budget stops additional pages", async () => {
    const pages: Record<string, string> = {
      "https://example.com/": `<html><body>
        <a href="/a">a</a>
        <a href="/b">b</a>
        <p>${"Local service details for homeowners. ".repeat(20)}</p>
      </body></html>`,
      "https://example.com/a": `<html><body><p>${"More service details. ".repeat(20)}</p></body></html>`,
      "https://example.com/b": `<html><body><p>${"More service details. ".repeat(20)}</p></body></html>`
    };
    const { fetchAdapter: baseFetchAdapter } = mockedSite(pages);
    const fetchAdapter: FetchAdapter = async (url, init) => {
      if (
        init?.method !== "HEAD" &&
        !url.endsWith("/robots.txt") &&
        !url.endsWith("/")
      ) {
        await new Promise((resolve) => setTimeout(resolve, 15));
      }
      return baseFetchAdapter(url, init);
    };

    const report = await assessWebsite(
      { url: "https://example.com/" },
      {
        fetchAdapter,
        maxPages: 10,
        maxCrawlDurationMs: 10,
        crawlDelayMs: 0,
        now: () => new Date("2026-06-10T12:00:00.000Z")
      }
    );

    expect(report.crawlMetadata.pagesCrawled).toBeGreaterThanOrEqual(1);
    expect(report.crawlMetadata.pagesCrawled).toBeLessThan(3);
    expect(report.evidenceQuality.assessmentStatus).toBe("partial");
    expect(report.evidenceQuality.limitations).toContain(
      "The assessment stopped crawling additional pages to stay within the production runtime budget."
    );
    expect(report.crawlMetadata.skippedUrls).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          reason: "skipped because the production crawl time budget was reached"
        })
      ])
    );
  });

  it("generates a complete owner-friendly report with evidence and skipped PageSpeed", async () => {
    const { fetchAdapter } = mockedSite(
      {
        "https://example.com/": `
          <html>
            <head>
              <title>Medina Hair Salon serving Valley City</title>
              <meta name="description" content="Locally owned hair salon near Medina." />
              <meta name="viewport" content="width=device-width, initial-scale=1" />
              <link rel="icon" href="/favicon.ico" />
              <script type="application/ld+json">{"@type":"LocalBusiness"}</script>
            </head>
            <body>
              <a href="tel:330-555-1212">Call</a>
              <a href="/contact">Contact us</a>
              <a href="/service-area">Areas we serve</a>
              <a href="https://google.com/maps/place/example">Map</a>
              <img src="/team-photo.jpg" alt="team photo" />
              <h1>Hair services for families</h1>
              <p>${"Detailed local service content for families in Medina and Valley City. ".repeat(30)}</p>
              <p>We provide services for homeowners and families. Locally owned, licensed, certified, and trusted for 12 years in business.</p>
              <p>Testimonials, reviews, FAQ, before and after project photos, and case study examples.</p>
              <p>Call today to schedule an appointment or request an estimate.</p>
              <form action="/contact"></form>
            </body>
          </html>`,
        "https://example.com/contact": `<html><body>Contact form ${"Appointment and estimate details for local families. ".repeat(12)}</body></html>`,
        "https://example.com/service-area": `<html><body>Areas we serve ${"Medina Valley City and nearby local service area details. ".repeat(12)}</body></html>`
      },
      { broken: ["https://example.com/team-photo.jpg"] }
    );

    const report = await assessWebsite(
      { url: "https://example.com/" },
      {
        fetchAdapter,
        crawlDelayMs: 0,
        now: () => new Date("2026-06-05T12:00:00.000Z")
      }
    );

    expect(report.grade).toMatch(/[A-F]/);
    expect(report.categories).toHaveLength(8);
    for (const category of report.categories) {
      expect(category.label).toBeTruthy();
      expect(category.score).toBeGreaterThanOrEqual(0);
      expect(
        category.evidenceFound.length + category.evidenceMissing.length
      ).toBeGreaterThan(0);
      expect(category.businessImpact).not.toMatch(/\bLCP\b|\bCLS\b|\bSQL\b/i);
      expect(category.recommendedFix).toBeTruthy();
      expect(category.weight).toBeGreaterThan(0);
      expect(category.factors.length).toBeGreaterThan(0);
      if (category.scoreStatus === "unavailable") {
        expect(category.scoreExplanation.formula).toContain(
          "not included in the overall score"
        );
      } else {
        expect(category.scoreExplanation.formula).toContain("factors passed");
      }
      expect(category.scoreExplanation.totalFactors).toBe(category.factors.length);
      expect(category.scoreExplanation.weightedContribution).toBeGreaterThanOrEqual(0);
    }
    expect(
      report.categories.map((category) => category.businessImpact).join(" ")
    ).not.toMatch(/signals signals|ai discoverability/);

    expect(report.crawlMetadata.pagespeed).toEqual({
      status: "skipped",
      explanation:
        "PageSpeed was skipped because no API key is configured. No performance score was invented."
    });
    expect(
      report.categories.find((category) => category.category === "performance")
        ?.scoreStatus
    ).toBe("unavailable");
    expect(report.topBusinessProblems.join(" ")).not.toContain("Performance:");
    expect(report.evidenceQuality.assessmentStatus).toBe("successful");
    expect(report.evidenceQuality.confidence).toBe("high");
    expect(report.evidenceQuality.meaningfulPages).toBeGreaterThan(0);
    expect(report.topBusinessProblems.length).toBeGreaterThan(0);
    expect(report.topBusinessProblems.length).toBeLessThanOrEqual(5);
    expect(report.topRecommendedFixes).toHaveLength(report.topBusinessProblems.length);
    expect(report.topBusinessProblems.join(" ")).not.toContain(
      "signals are helping visitors"
    );
    expect(report.revenueLeakageExplanation).toContain("visitors");
    expect(report.neighborReferralScore).toBeGreaterThanOrEqual(1);
    expect(report.disclaimer).toContain("automated public website assessment");
    expect(
      report.categories.find((category) => category.category === "securityReliability")
        ?.evidenceMissing
    ).toContain("Broken internal images were found.");
  });

  it("explains score factors in business language with existing-content distinctions", async () => {
    const { fetchAdapter } = mockedSite({
      "https://example.com/": `<html><body>
        <h1>Local real estate services</h1>
        <p>Call 330-555-1212. ${"Detailed public service evidence for local buyers and sellers. ".repeat(12)}</p>
      </body></html>`
    });

    const report = await assessWebsite(
      { url: "https://example.com/" },
      {
        fetchAdapter,
        crawlDelayMs: 0,
        now: () => new Date("2026-06-05T12:00:00.000Z")
      }
    );
    const localVisibility = report.categories.find(
      (category) => category.category === "localVisibility"
    );
    const schemaFactor = localVisibility?.factors.find(
      (factor) => factor.check === "Structured business information"
    );
    const googleFactor = localVisibility?.factors.find(
      (factor) => factor.check === "Google Business connection"
    );

    expect(localVisibility?.scoreExplanation.summary).toContain("evidence checks");
    expect(schemaFactor?.passed).toBe(false);
    expect(schemaFactor?.businessExplanation).toContain(
      "machine-readable business information"
    );
    expect(schemaFactor?.existingContentNote).toContain(
      "biography, address, or service page helps human visitors"
    );
    expect(schemaFactor?.recommendedAction).toContain("Add LocalBusiness schema");
    expect(googleFactor?.businessExplanation).toContain(
      "direct connection between the website and Google Business presence"
    );
  });

  it("acknowledges found phone and location evidence with examples before advising", async () => {
    const { fetchAdapter } = mockedSite({
      "https://example.com/": `<html><body>
        <h1>Cleaning services across North Georgia</h1>
        <a href="tel:770-555-1212">Call now</a>
        <a href="/woodstock-cleaning-services">Woodstock</a>
        <a href="/marietta-cleaning-services">Marietta</a>
        <a href="/areas-de-servicio/roswell">Roswell</a>
        <p>${"House cleaning and office cleaning services for homeowners and businesses in local service areas. ".repeat(14)}</p>
      </body></html>`,
      "https://example.com/woodstock-cleaning-services": `<html><body>${"Woodstock cleaning service area details for local homeowners. ".repeat(12)}</body></html>`,
      "https://example.com/marietta-cleaning-services": `<html><body>${"Marietta cleaning service area details for local businesses. ".repeat(12)}</body></html>`,
      "https://example.com/areas-de-servicio/roswell": `<html><body>${"Roswell cleaning service area details in Spanish and English. ".repeat(12)}</body></html>`
    });

    const report = await assessWebsite(
      { url: "https://example.com/" },
      {
        fetchAdapter,
        crawlDelayMs: 0,
        now: () => new Date("2026-06-07T12:00:00.000Z")
      }
    );
    const localVisibility = report.categories.find(
      (category) => category.category === "localVisibility"
    );
    const leadConversion = report.categories.find(
      (category) => category.category === "leadConversion"
    );

    expect(localVisibility?.evidenceFound.join(" ")).toContain(
      "/woodstock-cleaning-services"
    );
    expect(localVisibility?.evidenceFound.join(" ")).toContain(
      "/areas-de-servicio/roswell"
    );
    expect(localVisibility?.evidenceMissing.join(" ")).toContain(
      "Structured business information was not found"
    );
    expect(leadConversion?.evidenceFound.join(" ")).toContain("770-555-1212");
    expect(
      leadConversion?.factors.find((factor) => factor.check === "Click-to-call link")
        ?.evidence
    ).toContain("tel:770-555-1212");
  });

  it("detects testimonial-like customer proof inside review sections", async () => {
    const { fetchAdapter } = mockedSite({
      "https://example.com/": `<html><body>
        <h1>Cleaning services near Woodstock</h1>
        <a href="tel:770-555-1212">Call now</a>
        <section id="reviews">
          <h2>Client reviews</h2>
          <article class="review-card">
            <h3>Symone Pitt</h3>
            <div aria-label="5 stars">★★★★★</div>
            <p>Rosa is amazing and a strong recommendation. We will use her services for years to come.</p>
          </article>
          <article class="review-card">
            <h3>Aiyisha Adams</h3>
            <div aria-label="5 stars">★★★★★</div>
            <p>She did an amazing job. I recommend Rosa every time someone asks who cleans my home.</p>
          </article>
        </section>
        <p>${"Detailed cleaning service evidence for local homeowners and small businesses. ".repeat(14)}</p>
      </body></html>`
    });

    const report = await assessWebsite(
      { url: "https://example.com/" },
      {
        fetchAdapter,
        crawlDelayMs: 0,
        now: () => new Date("2026-06-07T12:00:00.000Z")
      }
    );
    const trustSignals = report.categories.find(
      (category) => category.category === "trustSignals"
    );
    const testimonialFactor = trustSignals?.factors.find(
      (factor) => factor.check === "Testimonials"
    );
    const reviewFactor = trustSignals?.factors.find(
      (factor) => factor.check === "Reviews or ratings"
    );

    expect(testimonialFactor?.passed).toBe(true);
    expect(reviewFactor?.passed).toBe(true);
    expect(trustSignals?.evidenceFound.join(" ")).toContain(
      "Testimonials are mentioned"
    );
  });

  it("shows concrete evidence details before claiming phone or location signals are missing", async () => {
    const { fetchAdapter } = mockedSite({
      "https://example.com/": `<html><body>
        <h1>Local cabinet refinishing</h1>
        <p>${"Cabinet refinishing services for homeowners with detailed project information. ".repeat(14)}</p>
        <a href="/services">Services</a>
      </body></html>`,
      "https://example.com/services": `<html><body>${"Cabinet painting and refinishing service details for homeowners. ".repeat(12)}</body></html>`
    });

    const report = await assessWebsite(
      { url: "https://example.com/" },
      {
        fetchAdapter,
        crawlDelayMs: 0,
        now: () => new Date("2026-06-08T12:00:00.000Z")
      }
    );
    const localVisibility = report.categories.find(
      (category) => category.category === "localVisibility"
    );
    const phoneFactor = localVisibility?.factors.find(
      (factor) => factor.check === "Visible phone number"
    );
    const locationFactor = localVisibility?.factors.find(
      (factor) => factor.check === "Location or service-area pages"
    );

    expect(phoneFactor?.passed).toBe(false);
    expect(phoneFactor?.evidenceDetails.join(" ")).toContain("Pages checked:");
    expect(phoneFactor?.evidenceDetails.join(" ")).toContain(
      "Visible phone-like text found: none"
    );
    expect(phoneFactor?.evidenceDetails.join(" ")).toContain("tel: links found: none");
    expect(locationFactor?.passed).toBe(false);
    expect(locationFactor?.evidenceDetails.join(" ")).toContain(
      "Location or service-area candidate links found: none"
    );
  });

  it("explains testimonial negatives when review evidence exists instead", async () => {
    const { fetchAdapter } = mockedSite({
      "https://example.com/": `<html><body>
        <h1>Local repair services</h1>
        <section>
          <h2>Reviews</h2>
          <p>Rated 5 stars by customers across local service calls.</p>
        </section>
        <p>${"Detailed local repair service information for homeowners and businesses. ".repeat(14)}</p>
      </body></html>`
    });

    const report = await assessWebsite(
      { url: "https://example.com/" },
      {
        fetchAdapter,
        crawlDelayMs: 0,
        now: () => new Date("2026-06-08T12:00:00.000Z")
      }
    );
    const trustSignals = report.categories.find(
      (category) => category.category === "trustSignals"
    );
    const testimonialFactor = trustSignals?.factors.find(
      (factor) => factor.check === "Testimonials"
    );

    expect(testimonialFactor?.passed).toBe(false);
    expect(testimonialFactor?.evidenceDetails.join(" ")).toContain(
      "Review or rating evidence found"
    );
    expect(testimonialFactor?.evidenceDetails.join(" ")).toContain(
      "Testimonials are customer stories"
    );
  });

  it("shows source page, image URL, response code, and alt text for broken image findings", async () => {
    const { fetchAdapter } = mockedSite(
      {
        "https://example.com/": `<html><body>
          <h1>Local cleaning services</h1>
          <img src="/missing-team.jpg" alt="Team cleaning kitchen" />
          <p>${"Detailed cleaning service information for local homeowners and businesses. ".repeat(14)}</p>
        </body></html>`
      },
      { broken: ["https://example.com/missing-team.jpg"] }
    );

    const report = await assessWebsite(
      { url: "https://example.com/" },
      {
        fetchAdapter,
        crawlDelayMs: 0,
        now: () => new Date("2026-06-08T12:00:00.000Z")
      }
    );
    const security = report.categories.find(
      (category) => category.category === "securityReliability"
    );
    const brokenImageFactor = security?.factors.find(
      (factor) => factor.check === "Broken internal images"
    );
    const detailText = brokenImageFactor?.evidenceDetails.join(" ");

    expect(brokenImageFactor?.passed).toBe(false);
    expect(detailText).toContain("Source page: https://example.com/");
    expect(detailText).toContain("image URL: https://example.com/missing-team.jpg");
    expect(detailText).toContain("response code: 404");
    expect(detailText).toContain("alt text: Team cleaning kitchen");
  });

  it("decodes escaped image URLs before checking for broken images", async () => {
    const calls: string[] = [];
    const fetchAdapter: FetchAdapter = async (url, init) => {
      calls.push(url);
      if (url === "https://example.com/robots.txt") {
        return response(url, 404, "");
      }
      if (url === "https://example.com/sitemap.xml") {
        return response(url, 200, "<urlset />", "application/xml");
      }
      if (init?.method === "HEAD") {
        return response(url, 200, "");
      }
      if (url === "https://example.com/") {
        return response(
          url,
          200,
          `<html><body>
            <h1>Local cleaning services</h1>
            <img src="/_next/image?url=%2Flogo.png&amp;w=3840&amp;q=75" alt="Logo" />
            <p>${"Detailed cleaning service information for local homeowners and businesses. ".repeat(20)}</p>
          </body></html>`
        );
      }
      return response(url, 404, "");
    };

    const report = await assessWebsite(
      { url: "https://example.com/" },
      {
        fetchAdapter,
        crawlDelayMs: 0,
        now: () => new Date("2026-06-08T12:00:00.000Z")
      }
    );
    const security = report.categories.find(
      (category) => category.category === "securityReliability"
    );
    const brokenImageFactor = security?.factors.find(
      (factor) => factor.check === "Broken internal images"
    );

    expect(calls).toContain(
      "https://example.com/_next/image?url=%2Flogo.png&w=3840&q=75"
    );
    expect(calls).not.toContain(
      "https://example.com/_next/image?url=%2Flogo.png&amp;w=3840&amp;q=75"
    );
    expect(brokenImageFactor?.passed).toBe(true);
  });

  it("checks duplicate internal asset URLs only once during passive validation", async () => {
    const calls: string[] = [];
    const fetchAdapter: FetchAdapter = async (url, init) => {
      calls.push(`${init?.method ?? "GET"} ${url}`);
      if (url === "https://example.com/robots.txt") {
        return response(url, 404, "");
      }
      if (url === "https://example.com/sitemap.xml") {
        return response(url, 200, "<urlset />", "application/xml");
      }
      if (init?.method === "HEAD") {
        return response(url, 200, "");
      }
      if (url === "https://example.com/") {
        return response(
          url,
          200,
          `<html><body>
            <h1>Local roofing services</h1>
            <a href="/service">Service</a>
            <img src="/shared-logo.png" alt="Logo" />
            <p>${"Detailed roofing service information for local homeowners and businesses. ".repeat(20)}</p>
          </body></html>`
        );
      }
      if (url === "https://example.com/service") {
        return response(
          url,
          200,
          `<html><body>
            <h1>Roof repair service</h1>
            <img src="/shared-logo.png" alt="Logo" />
            <p>${"Detailed roof repair service information for local homeowners and businesses. ".repeat(20)}</p>
          </body></html>`
        );
      }
      return response(url, 404, "");
    };

    await assessWebsite(
      { url: "https://example.com/" },
      {
        fetchAdapter,
        crawlDelayMs: 0,
        now: () => new Date("2026-06-08T12:00:00.000Z")
      }
    );

    expect(
      calls.filter((call) => call === "HEAD https://example.com/shared-logo.png")
    ).toHaveLength(1);
  });

  it("does not score or report when no meaningful pages are crawled", async () => {
    const calls: string[] = [];
    const fetchAdapter: FetchAdapter = async (url) => {
      calls.push(url);
      if (url === "https://example.com/robots.txt") {
        return response(url, 404, "");
      }
      return new Promise((resolve) => {
        setTimeout(() => resolve(response(url, 200, "<html></html>")), 50);
      });
    };

    await expect(
      assessWebsite(
        { url: "https://example.com/" },
        {
          fetchAdapter,
          crawlDelayMs: 0,
          requestTimeoutMs: 5,
          now: () => new Date("2026-06-05T12:00:00.000Z")
        }
      )
    ).rejects.toThrow(InsufficientEvidenceError);

    expect(calls).toContain("https://example.com/");
  });

  it("does not score when extracted readable text is too thin for a trustworthy report", async () => {
    const { fetchAdapter } = mockedSite({
      "https://example.com/": `<html><body><h1>Restaurant</h1><p>${"Order sandwiches online today. ".repeat(9)}</p></body></html>`
    });

    await expect(
      assessWebsite(
        { url: "https://example.com/" },
        {
          fetchAdapter,
          crawlDelayMs: 0,
          now: () => new Date("2026-06-05T12:00:00.000Z")
        }
      )
    ).rejects.toThrow(
      "extracted too little readable public page text to support a trustworthy scored report"
    );
  });

  it("marks low-coverage reports as partial with visible confidence limits", async () => {
    const { fetchAdapter } = mockedSite({
      "https://example.com/": `<html><body><h1>Local plumbing services</h1><p>Call 330-555-1212 for service in Medina County. We provide services for homeowners. ${"Helpful local service detail. ".repeat(12)}</p></body></html>`
    });

    const report = await assessWebsite(
      { url: "https://example.com/" },
      {
        fetchAdapter,
        crawlDelayMs: 0,
        now: () => new Date("2026-06-05T12:00:00.000Z")
      }
    );

    expect(report.evidenceQuality.assessmentStatus).toBe("partial");
    expect(report.evidenceQuality.confidence).toBe("low");
    expect(report.evidenceQuality.limitations.length).toBeGreaterThan(0);
    expect(
      report.categories.every(
        (category) =>
          category.category === "performance" ||
          category.scoreExplanation.confidence === "low"
      )
    ).toBe(true);
  });

  it("truncates oversized HTML responses and reports byte metadata", async () => {
    const largeHtml = `<html><body>${"A".repeat(200)}<a href="/after-limit">late</a></body></html>`;
    const { fetchAdapter } = mockedSite({
      "https://example.com/": largeHtml
    });

    const crawl = await crawlWebsite(new URL("https://example.com/"), fetchAdapter, {
      crawlDelayMs: 0,
      requestTimeoutMs: 100,
      maxResponseBytes: 80
    });

    expect(crawl.pages).toHaveLength(1);
    expect(crawl.pages[0]?.truncated).toBe(true);
    expect(crawl.pages[0]?.bytesRead).toBeGreaterThan(80);
    expect(crawl.decisions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          action: "crawled",
          reason: "crawled with response truncated at size limit",
          bytesRead: expect.any(Number)
        })
      ])
    );
    expect(crawl.pages.some((page) => page.url.endsWith("/after-limit"))).toBe(false);
  });

  it("records redirect decisions without crossing the submitted-domain boundary", async () => {
    const fetchAdapter: FetchAdapter = async (url, init) => {
      if (url === "https://example.com/robots.txt") {
        return response(url, 404, "");
      }
      if (init?.method === "HEAD") {
        return response(url, 200, "");
      }
      if (url === "https://example.com/") {
        return response(
          "https://outside.example/",
          200,
          "<html><body>Outside redirect target</body></html>"
        );
      }
      return response(url, 404, "");
    };

    const crawl = await crawlWebsite(new URL("https://example.com/"), fetchAdapter, {
      crawlDelayMs: 0,
      requestTimeoutMs: 100,
      maxResponseBytes: 5000
    });

    expect(crawl.pages).toHaveLength(0);
    expect(crawl.skippedUrls).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          url: "https://example.com/",
          reason: "redirected outside submitted domain"
        })
      ])
    );
  });

  it("allows redirects between apex and www variants of the submitted domain", async () => {
    const fetchAdapter: FetchAdapter = async (url, init) => {
      if (url === "https://example.com/robots.txt") {
        return response(url, 404, "");
      }
      if (init?.method === "HEAD") {
        return response(url, 200, "");
      }
      if (url === "https://example.com/") {
        return response(
          "https://www.example.com/",
          200,
          `<html><body><h1>Local services</h1><p>Call 330-555-1212. ${"Detailed public service evidence. ".repeat(12)}</p></body></html>`
        );
      }
      return response(url, 404, "");
    };

    const report = await assessWebsite(
      { url: "https://example.com/" },
      {
        fetchAdapter,
        crawlDelayMs: 0,
        requestTimeoutMs: 100,
        maxResponseBytes: 5000
      }
    );

    expect(report.crawlMetadata.pagesCrawled).toBe(1);
    expect(report.crawlMetadata.decisions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          url: "https://www.example.com/",
          action: "crawled"
        })
      ])
    );
  });

  it("redacts secrets in emitted assessment events", async () => {
    const events: Array<{ message: string; url?: string }> = [];
    const fetchAdapter: FetchAdapter = async (url) => {
      if (url === "https://example.com/robots.txt") {
        return response(url, 404, "");
      }
      throw new Error("api_key=secret password=hunter2 Bearer abc.def.ghi");
    };

    await expect(
      assessWebsite(
        { url: "https://example.com/" },
        {
          fetchAdapter,
          crawlDelayMs: 0,
          requestTimeoutMs: 100,
          eventSink: (event) => events.push(event)
        }
      )
    ).rejects.toThrow("[REDACTED]");

    expect(events.some((event) => event.message.includes("secret"))).toBe(false);
    expect(events.some((event) => event.message.includes("hunter2"))).toBe(false);
    expect(events.map((event) => event.message).join(" ")).toContain("[REDACTED]");
  });

  it("handles PageSpeed adapter timeout without inventing performance evidence", async () => {
    const { fetchAdapter } = mockedSite({
      "https://example.com/": `<html><body>Services for local homeowners. ${"Detailed service area and appointment information. ".repeat(12)}</body></html>`
    });

    const report = await assessWebsite(
      { url: "https://example.com/" },
      {
        fetchAdapter,
        pagespeedApiKey: "test-key",
        pageSpeedAdapter: () =>
          new Promise((resolve) => {
            setTimeout(
              () => resolve({ mobilePerformanceScore: 100, summary: "Too late" }),
              50
            );
          }),
        requestTimeoutMs: 5,
        pageSpeedTimeoutMs: 5,
        crawlDelayMs: 0
      }
    );

    expect(report.crawlMetadata.pagespeed).toEqual({
      status: "failed",
      explanation:
        "PageSpeed could not be reached, so the report does not make a performance claim from that API."
    });
    expect(
      report.categories.find((category) => category.category === "performance")
        ?.evidenceMissing
    ).toContain(
      "PageSpeed could not be reached, so the report does not make a performance claim from that API."
    );
  });

  it("uses the PageSpeed-specific timeout instead of the crawl request timeout", async () => {
    const { fetchAdapter } = mockedSite({
      "https://example.com/": `<html><body>Services for local homeowners. ${"Detailed service area and appointment information. ".repeat(12)}</body></html>`
    });

    const report = await assessWebsite(
      { url: "https://example.com/" },
      {
        fetchAdapter,
        pagespeedApiKey: "test-key",
        pageSpeedAdapter: () =>
          new Promise((resolve) => {
            setTimeout(
              () =>
                resolve({
                  mobilePerformanceScore: 91,
                  summary: "PageSpeed reported a mobile performance score of 91/100."
                }),
              20
            );
          }),
        requestTimeoutMs: 5,
        pageSpeedTimeoutMs: 100,
        crawlDelayMs: 0
      }
    );

    expect(report.crawlMetadata.pagespeed).toEqual({
      status: "success",
      explanation: "PageSpeed reported a mobile performance score of 91/100.",
      mobilePerformanceScore: 91
    });
    expect(
      report.categories.find((category) => category.category === "performance")
    ).toMatchObject({
      scoreStatus: "scored",
      score: 91
    });
  });

  it("scores measured PageSpeed performance from the measured score", async () => {
    const { fetchAdapter } = mockedSite({
      "https://example.com/": `<html><body>Services for local homeowners. ${"Detailed service area and appointment information. ".repeat(12)}</body></html>`
    });

    const report = await assessWebsite(
      { url: "https://example.com/" },
      {
        fetchAdapter,
        pagespeedApiKey: "test-key",
        pageSpeedAdapter: async () => ({
          mobilePerformanceScore: 47,
          summary: "PageSpeed reported a mobile performance score of 47/100."
        }),
        crawlDelayMs: 0
      }
    );

    const performance = report.categories.find(
      (category) => category.category === "performance"
    );

    expect(performance).toMatchObject({
      scoreStatus: "scored",
      score: 47
    });
    expect(performance?.scoreExplanation.formula).toContain(
      "PageSpeed mobile performance score = 47/100"
    );
    expect(performance?.evidenceMissing).toContain(
      "Mobile PageSpeed score was 47, below the recommended good range."
    );
    expect(report.topBusinessProblems).toContain(
      "Performance: Weak performance signals can cause local visitors to leave before they feel ready to call, book, or request an estimate."
    );
    expect(report.topBusinessProblems).not.toContain(
      "Lead Conversion: Your lead conversion signals are helping visitors understand and trust the business."
    );
  });

  it("includes demand satisfaction in the generated customer report", async () => {
    const { fetchAdapter } = mockedSite({
      "https://example.com/": `<html><head>
        <title>Example Cleaning Services</title>
        <meta name="description" content="House cleaning, deep cleaning, move out cleaning, and recurring home cleaning." />
        </head><body>
          <p>${"We provide house cleaning, deep cleaning, office cleaning, weekly cleaning, free estimates, reviews, and service area information for homeowners. ".repeat(12)}</p>
        </body></html>`
    });

    const report = await assessWebsite(
      { url: "https://example.com/" },
      {
        fetchAdapter,
        crawlDelayMs: 0
      }
    );

    expect(report.demandSatisfaction).toMatchObject({
      status: "assessed",
      sector: "cleaning",
      sectorLabel: "Cleaning"
    });
    expect(report.demandSatisfaction.score).not.toBeNull();
    expect(report.demandSatisfaction.foundSummary.length).toBeGreaterThan(0);
  });
});

describe("favicon and structured-data detection", () => {
  it("detects <link rel=icon> even when /favicon.ico is broken, with evidence naming the link tag", async () => {
    const { fetchAdapter } = mockedSite(
      {
        "https://example.com/": `
          <html><head>
            <title>Rick Mottern Roofing serving North Georgia</title>
            <link rel="icon" href="/brand.svg" />
          </head>
          <body>
            <h1>Roofing services for homeowners</h1>
            <p>${"Roofing and construction services for homeowners across North Georgia. ".repeat(20)}</p>
          </body></html>`
      },
      { broken: ["https://example.com/favicon.ico"] }
    );

    const report = await assessWebsite(
      { url: "https://example.com/" },
      {
        fetchAdapter,
        crawlDelayMs: 0,
        now: () => new Date("2026-06-05T12:00:00.000Z")
      }
    );
    const securityCategory = report.categories.find(
      (category) => category.category === "securityReliability"
    );
    const iconFactor = securityCategory?.factors.find(
      (factor) => factor.check === "Site icon"
    );

    expect(iconFactor?.passed).toBe(true);
    expect(iconFactor?.evidenceDetails.join(" ")).toMatch(/link rel=icon/i);
  });

  it("detects a responding /favicon.ico when no <link rel=icon> tag is present", async () => {
    const { fetchAdapter } = mockedSite({
      "https://example.com/": `
        <html><head><title>Rick Mottern Plumbing serving North Georgia</title></head>
        <body>
          <h1>Plumbing services for homeowners</h1>
          <p>${"Plumbing repair and installation services for homeowners across North Georgia. ".repeat(20)}</p>
        </body></html>`
    });

    const report = await assessWebsite(
      { url: "https://example.com/" },
      {
        fetchAdapter,
        crawlDelayMs: 0,
        now: () => new Date("2026-06-05T12:00:00.000Z")
      }
    );
    const securityCategory = report.categories.find(
      (category) => category.category === "securityReliability"
    );
    const iconFactor = securityCategory?.factors.find(
      (factor) => factor.check === "Site icon"
    );

    expect(iconFactor?.passed).toBe(true);
    expect(iconFactor?.evidenceDetails.join(" ")).toMatch(/favicon\.ico/i);
  });

  it("does not treat an <a href> icon link or a broken /favicon.ico as a favicon", async () => {
    const { fetchAdapter } = mockedSite(
      {
        "https://example.com/": `<html><body><a href="/icons/">Icons</a><p>Some content.</p></body></html>`
      },
      { broken: ["https://example.com/favicon.ico"] }
    );

    const crawl = await crawlWebsite(new URL("https://example.com/"), fetchAdapter, {
      crawlDelayMs: 0
    });
    const signals = await extractSignals(
      new URL("https://example.com/"),
      crawl.pages,
      fetchAdapter,
      {}
    );

    expect(signals.pages[0]?.iconLinkFound).toBe(false);
    expect(signals.faviconFound).toBe(false);
  });

  it("detects JSON-LD InsuranceAgency as a LocalBusiness-subtype schema", async () => {
    const { fetchAdapter } = mockedSite({
      "https://example.com/": `
        <html><head>
          <title>Rick Mottern Insurance Agency</title>
          <script type="application/ld+json">{"@context":"https://schema.org","@type":"InsuranceAgency","name":"Rick Mottern Insurance"}</script>
        </head>
        <body>
          <h1>Insurance services for families</h1>
          <p>${"Insurance planning and coverage services for families across North Georgia. ".repeat(20)}</p>
        </body></html>`
    });

    const crawl = await crawlWebsite(new URL("https://example.com/"), fetchAdapter, {
      crawlDelayMs: 0
    });
    const signals = await extractSignals(
      new URL("https://example.com/"),
      crawl.pages,
      fetchAdapter,
      {}
    );
    expect(signals.localBusinessSchemaFound).toBe(true);
    expect(signals.schemaTypes).toContain("InsuranceAgency");

    const report = await assessWebsite(
      { url: "https://example.com/" },
      {
        fetchAdapter,
        crawlDelayMs: 0,
        now: () => new Date("2026-06-05T12:00:00.000Z")
      }
    );
    const localVisibility = report.categories.find(
      (category) => category.category === "localVisibility"
    );
    const schemaFactor = localVisibility?.factors.find(
      (factor) => factor.check === "Structured business information"
    );

    expect(schemaFactor?.passed).toBe(true);
    expect(schemaFactor?.evidenceDetails.join(" ")).toContain("InsuranceAgency");
  });

  it("detects Organization inside @graph and notes it is a generic (not LocalBusiness-subtype) schema", async () => {
    const { fetchAdapter } = mockedSite({
      "https://example.com/": `
        <html><head>
          <title>Acme Consulting</title>
          <script type="application/ld+json">{"@context":"https://schema.org","@graph":[{"@type":"WebSite","name":"Acme Consulting"},{"@type":"Organization","name":"Acme Consulting"}]}</script>
        </head>
        <body>
          <h1>Consulting services for growing businesses</h1>
          <p>${"Consulting and advisory services for growing businesses across North Georgia. ".repeat(20)}</p>
        </body></html>`
    });

    const report = await assessWebsite(
      { url: "https://example.com/" },
      {
        fetchAdapter,
        crawlDelayMs: 0,
        now: () => new Date("2026-06-05T12:00:00.000Z")
      }
    );
    const localVisibility = report.categories.find(
      (category) => category.category === "localVisibility"
    );
    const schemaFactor = localVisibility?.factors.find(
      (factor) => factor.check === "Structured business information"
    );

    expect(schemaFactor?.passed).toBe(true);
    expect(schemaFactor?.evidenceDetails.join(" ")).toContain(
      "Organization schema found"
    );
  });

  it("does not treat WebPage/FAQPage JSON-LD types as business schema", async () => {
    const { fetchAdapter } = mockedSite({
      "https://example.com/": `
        <html><head>
          <title>Acme FAQ</title>
          <script type="application/ld+json">{"@type":["WebPage","FAQPage"]}</script>
        </head>
        <body>
          <h1>Frequently asked questions</h1>
          <p>${"Answers to frequently asked questions about our services. ".repeat(20)}</p>
        </body></html>`
    });

    const crawl = await crawlWebsite(new URL("https://example.com/"), fetchAdapter, {
      crawlDelayMs: 0
    });
    const signals = await extractSignals(
      new URL("https://example.com/"),
      crawl.pages,
      fetchAdapter,
      {}
    );
    expect(signals.schemaTypes).toEqual(expect.arrayContaining(["WebPage", "FAQPage"]));
    expect(signals.localBusinessSchemaFound).toBe(false);

    const report = await assessWebsite(
      { url: "https://example.com/" },
      {
        fetchAdapter,
        crawlDelayMs: 0,
        now: () => new Date("2026-06-05T12:00:00.000Z")
      }
    );
    const localVisibility = report.categories.find(
      (category) => category.category === "localVisibility"
    );
    const schemaFactor = localVisibility?.factors.find(
      (factor) => factor.check === "Structured business information"
    );
    expect(schemaFactor?.passed).toBe(false);
  });

  it("detects microdata itemtype=schema.org/LocalBusiness", async () => {
    const { fetchAdapter } = mockedSite({
      "https://example.com/": `<html><body>
        <div itemscope itemtype="https://schema.org/LocalBusiness">
          <span itemprop="name">Acme Cleaning</span>
        </div>
        <p>Some content.</p>
      </body></html>`
    });

    const crawl = await crawlWebsite(new URL("https://example.com/"), fetchAdapter, {
      crawlDelayMs: 0
    });
    const signals = await extractSignals(
      new URL("https://example.com/"),
      crawl.pages,
      fetchAdapter,
      {}
    );

    expect(signals.pages[0]?.schemaTypes).toContain("LocalBusiness");
    expect(signals.localBusinessSchemaFound).toBe(true);
  });

  it("does not throw on malformed JSON-LD and treats it as not found", async () => {
    const { fetchAdapter } = mockedSite({
      "https://example.com/": `<html><body>
        <script type="application/ld+json">{"@type": </script>
        <p>Some content.</p>
      </body></html>`
    });

    const crawl = await crawlWebsite(new URL("https://example.com/"), fetchAdapter, {
      crawlDelayMs: 0
    });
    const signals = await extractSignals(
      new URL("https://example.com/"),
      crawl.pages,
      fetchAdapter,
      {}
    );

    expect(signals.localBusinessSchemaFound).toBe(false);
    expect(signals.pages[0]?.schemaTypes ?? []).not.toContain("LocalBusiness");
  });
});

describe("three-state checks and coverage (B1)", () => {
  it("marks a check that could not be run as could_not_assess, not a failure, and leaves it out of the denominator", async () => {
    const { fetchAdapter } = mockedSite(
      {
        "https://example.com/": `<html><head><title>Local Services Co</title></head>
          <body>
            <a href="tel:770-555-1212">Call</a>
            <p>${"Detailed public service content for local families across the county. ".repeat(20)}</p>
          </body></html>`
      },
      { unreachable: ["https://example.com/sitemap.xml"] }
    );

    const report = await assessWebsite(
      { url: "https://example.com/" },
      { fetchAdapter, crawlDelayMs: 0, now: () => new Date("2026-09-26T12:00:00.000Z") }
    );

    const security = report.categories.find(
      (category) => category.category === "securityReliability"
    )!;
    const sitemapFactor = security.factors.find(
      (factor) => factor.check === "Sitemap"
    )!;

    expect(sitemapFactor.status).toBe("could_not_assess");
    expect(sitemapFactor.passed).toBe(false);
    expect(sitemapFactor.evidence.toLowerCase()).toContain("could not");
    expect(security.evidenceFound).not.toContain("sitemap.xml was found.");
    expect(security.evidenceMissing).not.toContain("sitemap.xml was not found.");
    expect(security.coverage.couldNotAssess).toBe(1);
    expect(security.coverage.total).toBe(security.factors.length);
    expect(security.coverage.assessable).toBe(security.coverage.total - 1);
    // The category still has enough assessable checks (5 of 6) to be scored
    // normally — the missing sitemap probe is excluded from the ratio
    // rather than counted as a failure.
    expect(security.scoreStatus).toBe("scored");
    expect(report.coverage.couldNotAssess).toBeGreaterThanOrEqual(1);
  });

  it("rolls up a coverage figure (assessable of total) across every category plus indexability", async () => {
    const { fetchAdapter } = mockedSite({
      "https://example.com/": `<html><head><title>Local Services Co</title>
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <link rel="icon" href="/favicon.ico" />
        </head>
        <body>
          <a href="tel:770-555-1212">Call</a>
          <p>${"Detailed public service content for local families across the county. ".repeat(20)}</p>
        </body></html>`
    });

    const report = await assessWebsite(
      { url: "https://example.com/" },
      { fetchAdapter, crawlDelayMs: 0, now: () => new Date("2026-09-26T12:00:00.000Z") }
    );

    expect(report.coverage.total).toBeGreaterThan(0);
    expect(report.coverage.assessable).toBeLessThanOrEqual(report.coverage.total);
    expect(
      report.coverage.assessable +
        report.coverage.couldNotAssess +
        report.coverage.notApplicable
    ).toBe(report.coverage.total);
  });
});

describe("indexability basics before content findings (B3)", () => {
  it("reports a clean, indexable homepage with every indexability check assessable", async () => {
    const { fetchAdapter } = mockedSite(
      {
        "https://example.com/": `<html><head><link rel="canonical" href="https://example.com/" /></head>
          <body>
            <a href="tel:770-555-1212">Call</a>
            <p>${"Content for a clean indexability fixture describing local services. ".repeat(20)}</p>
          </body></html>`
      },
      { robots: "User-agent: *\nAllow: /" }
    );

    const report = await assessWebsite(
      { url: "https://example.com/" },
      { fetchAdapter, crawlDelayMs: 0, now: () => new Date("2026-09-26T12:00:00.000Z") }
    );

    expect(report.indexability.blockedOrNoindex).toBe(false);
    expect(report.indexability.qualifiesContentFindings).toBe(false);
    expect(report.indexability.coverage.couldNotAssess).toBe(0);

    const httpStatus = report.indexability.findings.find(
      (finding) => finding.check === "Final HTTP status"
    )!;
    expect(httpStatus.status).toBe("observed");

    const canonical = report.indexability.findings.find(
      (finding) => finding.check === "Canonical tag"
    )!;
    expect(canonical.status).toBe("observed");
    expect(canonical.evidence).toContain("https://example.com/");

    const noindexFinding = report.indexability.findings.find(
      (finding) => finding.check === "Noindex directive"
    )!;
    expect(noindexFinding.status).toBe("not_observed");

    const robotsReachability = report.indexability.findings.find(
      (finding) => finding.check === "Robots.txt reachability"
    )!;
    expect(robotsReachability.status).toBe("observed");
  });

  it("records a redirect chain when the submitted URL redirects to a different final URL", async () => {
    const { fetchAdapter } = mockedSite(
      {
        "https://example.com/home": `<html><body>
          <a href="tel:770-555-1212">Call</a>
          <p>${"Content for a redirect-chain fixture describing local services. ".repeat(20)}</p>
        </body></html>`
      },
      { redirects: { "https://example.com/": "https://example.com/home" } }
    );

    const report = await assessWebsite(
      { url: "https://example.com/" },
      { fetchAdapter, crawlDelayMs: 0, now: () => new Date("2026-09-26T12:00:00.000Z") }
    );

    const redirectFinding = report.indexability.findings.find(
      (finding) => finding.check === "Redirect chain"
    )!;
    expect(redirectFinding.status).toBe("observed");
    expect(redirectFinding.evidence).toContain("https://example.com/");
    expect(redirectFinding.evidence).toContain("https://example.com/home");
  });

  it("marks 'robots.txt blocks crawled paths' not_applicable when robots.txt itself is missing", async () => {
    const { fetchAdapter } = mockedSite({
      "https://example.com/": `<html><body>
        <a href="tel:770-555-1212">Call</a>
        <p>${"Content for a missing-robots fixture describing local services. ".repeat(20)}</p>
      </body></html>`
    });

    const report = await assessWebsite(
      { url: "https://example.com/" },
      { fetchAdapter, crawlDelayMs: 0, now: () => new Date("2026-09-26T12:00:00.000Z") }
    );

    const reachability = report.indexability.findings.find(
      (finding) => finding.check === "Robots.txt reachability"
    )!;
    expect(reachability.status).toBe("not_observed");

    const blocks = report.indexability.findings.find(
      (finding) => finding.check === "Robots.txt blocks crawled paths"
    )!;
    expect(blocks.status).toBe("not_applicable");
    expect(report.indexability.coverage.notApplicable).toBe(1);
  });

  it("reports a blocked path when robots.txt disallows a path this assessment tried to crawl", async () => {
    const { fetchAdapter } = mockedSite(
      {
        "https://example.com/": `<html><body>
          <a href="/blocked">Blocked</a>
          <a href="tel:770-555-1212">Call</a>
          <p>${"Content for a robots-blocking fixture describing local services. ".repeat(20)}</p>
        </body></html>`
      },
      { robots: "User-agent: *\nDisallow: /blocked" }
    );

    const report = await assessWebsite(
      { url: "https://example.com/" },
      { fetchAdapter, crawlDelayMs: 0, now: () => new Date("2026-09-26T12:00:00.000Z") }
    );

    const blocks = report.indexability.findings.find(
      (finding) => finding.check === "Robots.txt blocks crawled paths"
    )!;
    expect(blocks.status).toBe("observed");
    expect(blocks.evidence).toContain("/blocked");
  });

  it("qualifies a downstream content finding instead of scoring a bare failure when the homepage is noindex", async () => {
    const { fetchAdapter } = mockedSite({
      "https://example.com/": `<html><head><title>Local Services Co</title>
          <meta name="robots" content="noindex, nofollow" />
        </head>
        <body>
          <a href="tel:770-555-1212">Call</a>
          <p>${"General public content about the business without curated proof sections. ".repeat(15)}</p>
        </body></html>`
    });

    const report = await assessWebsite(
      { url: "https://example.com/" },
      { fetchAdapter, crawlDelayMs: 0, now: () => new Date("2026-09-26T12:00:00.000Z") }
    );

    const noindexFinding = report.indexability.findings.find(
      (finding) => finding.check === "Noindex directive"
    )!;
    expect(noindexFinding.status).toBe("observed");
    expect(noindexFinding.evidence).toContain("noindex");
    expect(report.indexability.blockedOrNoindex).toBe(true);
    expect(report.indexability.qualifiesContentFindings).toBe(true);

    const trustSignals = report.categories.find(
      (category) => category.category === "trustSignals"
    )!;
    const testimonialsFactor = trustSignals.factors.find(
      (factor) => factor.check === "Testimonials"
    )!;

    // The genuine absence of testimonials on a noindex page cannot be
    // reported as a confirmed content failure (B3) — it becomes
    // could_not_assess (B1), not a bare "not found".
    expect(testimonialsFactor.status).toBe("could_not_assess");
    expect(testimonialsFactor.passed).toBe(false);
    expect(testimonialsFactor.evidence.toLowerCase()).toContain("noindex");
    expect(trustSignals.evidenceMissing).not.toContain("Testimonials were not found.");
  });

  it("does not qualify content findings when the homepage is indexable and reachable", async () => {
    const { fetchAdapter } = mockedSite({
      "https://example.com/": `<html><head><title>Local Services Co</title></head>
        <body>
          <a href="tel:770-555-1212">Call</a>
          <p>${"General public content about the business without curated proof sections. ".repeat(15)}</p>
        </body></html>`
    });

    const report = await assessWebsite(
      { url: "https://example.com/" },
      { fetchAdapter, crawlDelayMs: 0, now: () => new Date("2026-09-26T12:00:00.000Z") }
    );

    expect(report.indexability.qualifiesContentFindings).toBe(false);
    const trustSignals = report.categories.find(
      (category) => category.category === "trustSignals"
    )!;
    const testimonialsFactor = trustSignals.factors.find(
      (factor) => factor.check === "Testimonials"
    )!;
    // Same missing evidence, but an indexable page: a genuine, scored failure.
    expect(testimonialsFactor.status).toBe("not_observed");
    expect(trustSignals.evidenceMissing).toContain("Testimonials were not found.");
  });
});
