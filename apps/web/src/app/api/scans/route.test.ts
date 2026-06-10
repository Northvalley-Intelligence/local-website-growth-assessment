import { afterEach, describe, expect, it, vi } from "vitest";
import { cloudflareAssessmentLimits, resolvePageSpeedApiKey } from "./route";

describe("scan route runtime configuration", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("uses the Cloudflare Worker PageSpeed secret when process.env is unset", () => {
    vi.stubEnv("PAGESPEED_API_KEY", "");

    expect(
      resolvePageSpeedApiKey({
        env: {
          PAGESPEED_API_KEY: "cloudflare-secret"
        }
      })
    ).toBe("cloudflare-secret");
  });

  it("prefers the local PageSpeed environment variable during local development", () => {
    vi.stubEnv("PAGESPEED_API_KEY", "local-secret");

    expect(
      resolvePageSpeedApiKey({
        env: {
          PAGESPEED_API_KEY: "cloudflare-secret"
        }
      })
    ).toBe("local-secret");
  });

  it("leaves PageSpeed unavailable when neither runtime provides a key", () => {
    vi.stubEnv("PAGESPEED_API_KEY", "");

    expect(resolvePageSpeedApiKey(null)).toBeUndefined();
  });

  it("uses bounded production assessment limits below the Worker watchdog", () => {
    expect(cloudflareAssessmentLimits.maxPages).toBeLessThan(25);
    expect(cloudflareAssessmentLimits.maxCrawlDurationMs).toBeLessThan(25000);
    expect(cloudflareAssessmentLimits.requestTimeoutMs).toBeLessThan(10000);
    expect(cloudflareAssessmentLimits.pageSpeedTimeoutMs).toBeLessThan(5000);
    expect(cloudflareAssessmentLimits.passiveAssetCheckLimit).toBeLessThan(25);
    expect(cloudflareAssessmentLimits.passiveAssetTimeoutMs).toBeLessThan(3000);
  });
});
