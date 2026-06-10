# MDE Status

Last updated: 2026-06-10

## Current Phase

Phase 1: Complete Vertical Slice.

## Phase Goal

Build the first usable version:

URL input -> safe public crawl -> signal extraction -> scoring -> report page.

## Current Readiness

Phase 1 is deployed to staging and production for founder testing. Generation 38 added demand satisfaction to the assessment app by consuming the generated demand dataset from the separate demand-data-generation repository. Generation 39 completed the second clean verification with no implementation changes.

- Staging: `https://staging-assessment.northvalleyintel.com`
- Production: `https://assessment.northvalleyintel.com`
- Staging source branch: `staging`
- Production source branch: `main`

## Current BDD State

- Current generation: 39
- Critical unresolved: 0
- High unresolved: 0
- Low deferred: 1
- Two-pass verification: passed for demand satisfaction integration in Generations 38 and 39
- Self-QA gate: passed for a local Medina Clean assessment and rendered report inspection

Machine-readable BDD state lives in:

- `.mde/bdd-index.json`
- `.mde/failing-bdds.json`
- `.mde/generations/`

## Latest Validation

- Format: passed
- Lint: passed
- Typecheck: passed
- Unit tests: 46 passed
- Integration tests: 6 passed
- Build: passed
- Cloudflare build: passed with documented warnings
- Latest local validation scan: `medinaclean-com-1781067349467`
- Latest local scan result: completed with 11 pages crawled, high evidence confidence, PageSpeed measured, demand satisfaction assessed as Cleaning demand, and demand opportunities rendered with pages checked, found evidence, and missing signals.
- Report page check: demand section present in rendered HTML with `Customer Demand Fit`, `Cleaning demand`, `What We Found`, `Demand Gaps To Review`, and `Demand opportunities with evidence`.
- Demand integration result: generated demand records remain owned by `demand-data-generation`; this app consumes the active dataset and evaluates how the specific website satisfies observable demand.

## Known Risks

- PageSpeed can fail or time out in Cloudflare Worker runtime. The report marks Performance unavailable and does not invent a score.
- Dedicated background execution is still needed for stronger production reliability.
- Production Phase 1 scans intentionally use a smaller bounded crawl profile than local full-report runs. Large sites may receive partial assessments until Phase 2 background execution is available.
- The consumed demand dataset is currently copied into the assessment app as a release artifact. A later release should automate syncing from the demand-data-generation repository to avoid stale demand inputs.
- Demand-sector inference is deterministic and conservative. Unsupported or unclear industries are skipped rather than forced into a misleading demand score.
- Turbopack tracing warning remains documented as acceptable for Phase 1 only.
- Authenticated API access, scheduled scans, PDF/shareable reports, and consultation CTA are Phase 2+ work.
- The mistaken personal GitHub repository still exists and should only be deleted with explicit founder approval.

Detailed risk state lives in `.mde/risk-register.json`.

## Missing Founder Inputs

None required for current Phase 1 founder testing.

## Recommended Next Step

Deploy demand satisfaction to staging/production, then founder review of reports for supported local-service sectors.

Use Phase 2 for:

- one-page teaser PDF that clearly says it is not the final report and directs readers to `contact@northvalleyintel.com` for the complete report and fixing strategy
- report sharing/export
- consultation CTA
- authenticated API access
- scheduled scan/report workflows
- durable background execution
- production reliability hardening

## Artifact Map

Human-readable mission and status:

- `MISSION.md`
- `MISSION_UPDATES.md`
- `docs/operations/mde-status.md`

Agent-readable state:

- `.mde/state.json`
- `.mde/progress.json`
- `.mde/bdd-index.json`
- `.mde/failing-bdds.json`
- `.mde/task-graph.json`
- `.mde/risk-register.json`
- `.mde/decisions.jsonl`
- `.mde/generations/`

Deploy metadata:

- `deploy/build-manifest.json`
- `deploy/release-checks.json`
- `deploy/environment.schema.json`

## Goal Drift Review

1. What supports the mission?

   Phase 1 safely analyzes public website evidence, produces explainable recommendations, avoids confident reports when evidence is insufficient, and now compares observed website evidence against generated local-service demand records.

2. What is missing?

   Automated demand dataset sync, Phase 2 workflow polish, report export/share features, authenticated API access, scheduled scans, and stronger background execution.

3. What is over-engineered?

   Nothing material in the current Phase 1 slice.

4. What was deferred?

   PDF export, shareable reports, consultation CTA, scheduled scans, analytics connectors, durable queue-based execution, and automated demand artifact publishing.

5. Are we still helping local business owners understand why their website may not generate leads?

   Yes. The product remains focused on evidence-backed, business-readable website assessment for local lead generation.
