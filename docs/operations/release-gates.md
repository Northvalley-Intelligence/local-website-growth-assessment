# Release Gates

## Phase 0 Gate

- CI runs install, lint, typecheck, unit tests, integration tests, and build.
- Required docs exist.
- Environment strategy documented.
- Repo structure is clear.

## Phase 1 Gate

- Critical tests pass.
- High tests pass.
- Self-QA Gate: The system must be exercised end-to-end and the actual output reviewed before the work is considered ready.
- Two-Generation Readiness Gate: two consecutive fresh BDD generations must produce no unresolved Critical or High failures, with no implementation code changes between the two clean generations.
- Staging deployment readiness is documented.
- `docs/operations/mde-status.md` is current and shows no unresolved Critical or High local failures.
- `docs/operations/mde-status.md` includes a founder-facing status report with blockers, known risks, missing founder inputs, required credentials/access, unconfigured external dependencies, self-QA results, phase readiness, and recommendation.
- `docs/operations/mde-history/` is current enough to reconstruct phase history, mission evolution, BDD evolution, test evolution, implementation effort, self-QA outcomes, founder inputs, and readiness decisions.
- No production deployment occurs without explicit approval.

After the mission refinement in `docs/product/why.md`, Phase 1 also requires:

- Asynchronous assessment submission with pending, running, completed, and failed status.
- Customer-facing report hierarchy: Executive Summary, Biggest Opportunity, Top Recommended Actions, Score Summary, Supporting Evidence, then Detailed Findings.
- Report self-QA from small business owner and consultant-presenter perspectives.
- Request timeouts for crawl fetches and external adapters.
- Response-size protection before storing or parsing page text.
- Explicit bounded request concurrency or documented sequential crawl policy with tests.
- Observable crawl decisions, skipped reasons, PageSpeed status, adapter failures, page counts, and duration.
- Secret redaction applied to logs or event output, not only available as a helper.
- Explainable category scoring with evidence, formula, factor contribution, business impact, recommended fix, limitations, and confidence.
- Evidence sufficiency gate: no normal scored customer report is generated when no meaningful public website evidence was collected.
- Clear distinction between successful assessment, partial assessment, failed assessment, and insufficient evidence.
- Evidence traceability gate: score summaries must show what checks passed and what checks are missing.
- Negative-finding evidence gate: customer-facing claims that a signal is broken, missing, weak, or failed must show concrete evidence details such as pages checked, related evidence found, source page, destination or image URL, response code, and labels or alt text when available.
- Business explainability gate: missing signals must explain why they matter, whether similar human-facing content may already exist, and what additional signal or action is recommended.
- External measurement truthfulness gate: unavailable external measurements must be marked unavailable, while successful measurements must affect scoring according to measured evidence rather than measurement presence alone.
- Competitive validation gate: validation references, validation matrix, recurring public validation sites, site-validation template, score explainability validation, report quality validation, and missing validation inputs must be documented.
- MDE observability gate: current status and append-only history must be updated before readiness is claimed.
- Realistic validation covering redirects, slow or failed responses, non-HTML assets, broken pages, forms, external links, robots exclusions, and partial evidence.
- Bounded in-memory scan history or durable storage with retention controls.

## Known Phase 1 Build Warning

Phase 1 currently uses a local filesystem-backed scan store for asynchronous scan status, report viewing, and admin history during local/staging validation. This can produce a Turbopack tracing warning during `next build`.

This warning is acceptable for Phase 1 only if:

- The build passes.
- Automated tests pass.
- Runtime behavior works in local and staging.
- The warning is documented in `docs/operations/mde-status.md` and `docs/operations/known-limitations.md`.
- Phase 2 or production readiness includes replacing filesystem-backed local storage with a proper persistent store.

A passing build with this warning does not satisfy production readiness. Production remains blocked until filesystem-backed local scan storage is replaced with durable, deployment-compatible persistence or removed from the production runtime.
