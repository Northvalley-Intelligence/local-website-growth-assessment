import { describe, expect, it } from "vitest";
import {
  assessWebsite,
  crawlWebsite,
  InsufficientEvidenceError,
  type FetchAdapter
} from "./index.js";

function response(url: string, status: number, body = "", contentType = "text/html") {
  return {
    url,
    status,
    headers: {
      get(name: string) {
        if (name.toLowerCase() === "content-type") return contentType;
        return null;
      }
    },
    async text() {
      return body;
    }
  };
}

function mockedSite(
  pages: Record<string, string>,
  options: { robots?: string; broken?: string[] } = {}
) {
  const calls: Array<{ url: string; method: string }> = [];
  const broken = new Set(options.broken ?? []);

  const fetchAdapter: FetchAdapter = async (url: string, init) => {
    const method = init?.method ?? "GET";
    calls.push({ url, method });

    if (url === "https://example.com/robots.txt") {
      return response(url, options.robots ? 200 : 404, options.robots ?? "");
    }

    if (url === "https://example.com/sitemap.xml") {
      return response(url, 200, "<urlset />", "application/xml");
    }

    if (method === "HEAD") {
      return response(url, broken.has(url) ? 404 : 200, "");
    }

    const body = pages[url];
    if (!body) return response(url, 404, "not found");
    return response(url, 200, body);
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

  it("generates a complete owner-friendly report with evidence and skipped PageSpeed", async () => {
    const { fetchAdapter } = mockedSite(
      {
        "https://example.com/": `
          <html>
            <head>
              <title>Medina Hair Salon serving Valley City</title>
              <meta name="description" content="Locally owned hair salon near Medina." />
              <meta name="viewport" content="width=device-width, initial-scale=1" />
              <meta property="og:image" content="/salon.jpg" />
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
});
