import { describe, expect, it } from "vitest";
import { assessWebsite, type FetchAdapter } from "../../apps/worker/src/index";

function response(url: string, status: number, body = "", contentType = "text/html") {
  return {
    url,
    status,
    headers: {
      get(name: string) {
        return name.toLowerCase() === "content-type" ? contentType : null;
      }
    },
    async text() {
      return body;
    }
  };
}

describe("Phase 1 vertical slice integration", () => {
  it("turns a submitted URL into a safe public crawl and business report", async () => {
    const calls: Array<{ url: string; method: string }> = [];
    const fetchAdapter: FetchAdapter = async (url, init) => {
      const method = init?.method ?? "GET";
      calls.push({ url, method });

      if (url.endsWith("/robots.txt")) {
        return response(url, 200, "User-agent: *\nDisallow: /private");
      }
      if (url.endsWith("/sitemap.xml")) {
        return response(url, 404, "");
      }
      if (method === "HEAD") {
        return response(url, url.endsWith("/broken") ? 404 : 200, "");
      }
      if (url === "https://example.com/") {
        return response(
          url,
          200,
          `<html>
            <head><title>Local Services serving Medina</title><meta name="viewport" content="width=device-width" /></head>
            <body>
              <a href="/contact">Contact</a>
              <a href="/private">Private</a>
              <a href="/broken">Broken</a>
              <a href="https://outside.example/">Outside</a>
              <a href="tel:330-555-1212">Call</a>
              <p>${"Detailed local service evidence for Medina homeowners and families. ".repeat(14)}</p>
              <p>We provide services for homeowners. Reviews and testimonials available.</p>
            </body>
          </html>`
        );
      }
      if (url === "https://example.com/contact") {
        return response(
          url,
          200,
          `<html><body><form></form>Request an estimate ${"Contact and appointment information for local customers. ".repeat(12)}</body></html>`
        );
      }
      return response(url, 404, "");
    };

    const report = await assessWebsite(
      { url: "https://example.com/" },
      { fetchAdapter, crawlDelayMs: 0, now: () => new Date("2026-06-05T12:00:00Z") }
    );

    expect(report.url).toBe("https://example.com/");
    expect(report.categories).toHaveLength(8);
    expect(report.evidenceQuality.assessmentStatus).toBe("successful");
    expect(report.topBusinessProblems).toHaveLength(5);
    expect(report.topRecommendedFixes).toHaveLength(5);
    expect(report.crawlMetadata.pagespeed.status).toBe("skipped");
    expect(calls.some((call) => call.url === "https://example.com/private")).toBe(
      false
    );
    expect(calls.some((call) => call.url === "https://outside.example/")).toBe(false);
    expect(calls.every((call) => call.method === "GET" || call.method === "HEAD")).toBe(
      true
    );
  });
});
