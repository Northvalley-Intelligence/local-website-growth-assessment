# Testing Strategy

## Phase 0

Foundation tests verify the repository has the required structure, package scripts, docs, and CI commands.

## Phase 1

Critical tests:

- Respects robots.txt.
- Does not crawl outside submitted domain.
- Does not submit forms.
- Enforces max pages and max depth.
- Validates URLs safely.
- Generates report with evidence.
- Never fabricates PageSpeed or analytics data.
- Redacts secrets from logs.
- Blocks customer-facing reports when no meaningful public website evidence was collected.

High tests:

- Scores categories.
- Detects broken links.
- Detects trust signals.
- Detects contact signals.
- Generates plain-English recommendations.
- Handles PageSpeed failure gracefully.

Mission-refinement tests:

- Enforces request timeouts.
- Enforces response-size limits.
- Records observable crawl and skip decisions.
- Handles redirects and redirect loops safely.
- Keeps scan history or queues bounded.
- Validates against realistic mocked sites with slow responses, failed responses, non-HTML assets, and partial evidence.
- Queues assessment work asynchronously and exposes pending, running, completed, and failed status.
- Distinguishes successful, partial, failed, and insufficient-evidence outcomes.
- Shows confidence and limitations when reports are based on partial evidence.
- Proves category scores include factor-level explanations, formula, weight, contribution, and improvement guidance.
- Proves factor explanations connect checks, evidence, business impact, existing-content distinctions, and next actions.
- Verifies the report hierarchy puts executive summary, biggest opportunity, and recommended actions before detailed diagnostics.
- Verifies score summaries show passed and missing checks without forcing the user to search detailed diagnostics.
- Includes self-QA from both small business owner and consultant-presenter perspectives before report readiness is claimed.

## Competitive Validation Strategy

Competitive validation is an internal development activity and MDE telemetry source. It is not a customer-facing feature and does not add production dependencies.

Use validation references to improve confidence in:

- crawler correctness
- assessment correctness
- report quality
- score explainability
- feature coverage
- false positive detection
- false negative detection

Required validation artifacts:

- `docs/validation/reference-tools.md`
- `docs/validation/validation-matrix.md`
- `docs/validation/candidate-sites.md`
- `docs/validation/templates/site-validation-template.md`

Validation references:

- Lighthouse for page-level performance, accessibility, best-practices, and SEO checks.
- PageSpeed Insights for measured Performance validation when configured.
- Screaming Frog SEO Spider manual exports for crawl coverage, broken links, redirects, and metadata comparison.
- HubSpot Website Grader for owner-friendly report framing and plain-language comparison.
- Manual expert review for local visibility, lead conversion, trust, message clarity, AI discoverability, report quality, and score explainability.
- Internal fixture sites for repeatable regression tests.

The production product must not depend on Screaming Frog, HubSpot Website Grader, Semrush, Ahrefs, GTmetrix, or similar validation-reference tools.

No scoring category should remain in Phase 1 without a documented validation strategy in the validation matrix.
