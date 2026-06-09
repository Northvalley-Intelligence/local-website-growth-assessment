import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();

const requiredPaths = [
  "PROJECT.md",
  "README.md",
  ".env.example",
  ".github/workflows/ci.yml",
  "apps/web/package.json",
  "apps/worker/package.json",
  "packages/shared/package.json",
  "docs/product/why.md",
  "docs/product/what.md",
  "docs/product/phases.md",
  "docs/engineering/architecture.md",
  "docs/engineering/testing-strategy.md",
  "docs/engineering/security-data-handling.md",
  "docs/engineering/deployment.md",
  "docs/operations/bdd-session-playbook.md",
  "docs/operations/release-gates.md",
  "docs/operations/mdd-progress.md"
];

function read(path: string): string {
  return readFileSync(join(root, path), "utf8");
}

describe("Phase 0 foundation gate", () => {
  it("has the required repository structure and docs", () => {
    for (const path of requiredPaths) {
      expect(existsSync(join(root, path)), `${path} should exist`).toBe(true);
    }
  });

  it("keeps the mission and current phase visible at the root", () => {
    const project = read("PROJECT.md");

    expect(project).toContain(
      "Help local business owners understand why their website may not be generating leads"
    );
    expect(project).toContain("Phase 1: Complete Vertical Slice");
  });

  it("documents environment strategy without committing secrets", () => {
    const envExample = read(".env.example");
    const deployment = read("docs/engineering/deployment.md");

    expect(envExample).toContain("PAGESPEED_API_KEY");
    expect(envExample).toContain("NorthValleyIntelWebsiteAssessmentBot/0.1");
    expect(deployment).toContain("deployment provider secret storage");
    expect(envExample).not.toMatch(/sk-[A-Za-z0-9]/);
  });

  it("configures CI to run install, lint, typecheck, tests, integration tests, and build", () => {
    const ci = read(".github/workflows/ci.yml");

    expect(ci).toContain("npm ci");
    expect(ci).toContain("npm run lint");
    expect(ci).toContain("npm run typecheck");
    expect(ci).toContain("npm run test");
    expect(ci).toContain("npm run test:integration");
    expect(ci).toContain("npm run build");
  });

  it("records fresh BDD scenarios with Critical and High classifications", () => {
    const progress = read("docs/operations/mdd-progress.md");

    expect(progress).toContain("Fresh BDD Scenarios");
    expect(progress).toContain("Critical:");
    expect(progress).toContain("High:");
  });
});
