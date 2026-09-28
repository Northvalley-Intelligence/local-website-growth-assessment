import { describe, expect, it } from "vitest";
import { PROFILE_LINK_HOSTS, isOwnProfileLink } from "../src/index";

describe("own-profile link detection (handoff 11 part A)", () => {
  it("lists exactly the reviewed profile hosts", () => {
    expect([...PROFILE_LINK_HOSTS].sort()).toEqual(
      [
        "bbb.org",
        "facebook.com",
        "g.page",
        "google.com",
        "instagram.com",
        "linkedin.com",
        "maps.app.goo.gl",
        "nextdoor.com",
        "yelp.com"
      ].sort()
    );
  });

  it("matches the reviewed hosts, case-insensitively and with www./m. stripped", () => {
    expect(isOwnProfileLink("https://www.facebook.com/AcmePlumbing")).toBe(true);
    expect(isOwnProfileLink("https://FACEBOOK.com/AcmePlumbing")).toBe(true);
    expect(isOwnProfileLink("https://m.facebook.com/AcmePlumbing")).toBe(true);
    expect(isOwnProfileLink("https://www.yelp.com/biz/acme-plumbing")).toBe(true);
    expect(isOwnProfileLink("https://www.bbb.org/us/ga/acme-plumbing")).toBe(true);
    expect(isOwnProfileLink("https://www.instagram.com/acmeplumbing")).toBe(true);
    expect(isOwnProfileLink("https://www.linkedin.com/company/acme-plumbing")).toBe(
      true
    );
    expect(isOwnProfileLink("https://nextdoor.com/pages/acme-plumbing")).toBe(true);
    expect(isOwnProfileLink("https://g.page/acme-plumbing")).toBe(true);
    expect(isOwnProfileLink("https://maps.app.goo.gl/abc123")).toBe(true);
  });

  it("only counts google.com links whose path starts with /maps", () => {
    expect(isOwnProfileLink("https://www.google.com/maps/place/Acme+Plumbing")).toBe(
      true
    );
    expect(isOwnProfileLink("https://www.google.com/search?q=acme+plumbing")).toBe(
      false
    );
    expect(isOwnProfileLink("https://www.google.com/")).toBe(false);
  });

  it("rejects unrelated, relative, and malformed links", () => {
    expect(isOwnProfileLink("https://example.com/facebook-tips")).toBe(false);
    expect(isOwnProfileLink("/contact")).toBe(false);
    expect(isOwnProfileLink("tel:+14705551234")).toBe(false);
    expect(isOwnProfileLink("mailto:hi@example.com")).toBe(false);
    expect(isOwnProfileLink("not a url at all")).toBe(false);
    expect(isOwnProfileLink("")).toBe(false);
  });
});
