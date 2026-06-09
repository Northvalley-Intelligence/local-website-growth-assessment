import { afterEach, describe, expect, it, vi } from "vitest";
import { resolvePageSpeedApiKey } from "./route";

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
});
