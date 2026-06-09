import { describe, expect, it } from "vitest";
import { gradeFromScore, redactSecrets } from "../src/index";

describe("shared security and report helpers", () => {
  it("redacts common secret patterns from logs", () => {
    const message =
      "api_key=abc123 token=secret-token password=hunter2 Authorization: Bearer abc.def.ghi sk-1234567890abcdef";

    expect(redactSecrets(message)).toBe(
      "api_key=[REDACTED] token=[REDACTED] password=[REDACTED] Authorization: Bearer [REDACTED] [REDACTED]"
    );
  });

  it("turns numeric scores into owner-friendly grades", () => {
    expect(gradeFromScore(95)).toBe("A");
    expect(gradeFromScore(84)).toBe("B");
    expect(gradeFromScore(74)).toBe("C");
    expect(gradeFromScore(64)).toBe("D");
    expect(gradeFromScore(40)).toBe("F");
  });
});
