# MDE Status

Last updated: 2026-06-19

## Current Phase

Phase 1: Complete Vertical Slice.

## Phase Goal

Build the first usable version:

URL input -> safe public crawl -> signal extraction -> scoring -> report page.

## Current Readiness

Phase 1 is deployed to staging and production for founder testing. Generation 38 added demand satisfaction to the assessment app by consuming the generated demand dataset from the separate demand-data-generation repository. Generation 39 completed the second clean verification with no implementation changes. Generation 40 deployed the demand satisfaction release to staging and production. Generation 41 synced the latest active demand artifact and added Welding demand support with optional monthly search counts in demand opportunities. Generation 42 synced the latest active demand artifact, added Senior Living demand support, and deployed the updated demand data to staging and production. Generation 43 updated the public README to explain how the project uses Mission-Driven Engineering and verified the GitHub repository is public. Generation 44 synced the latest active demand artifact after the Google Keyword Planner data update and deployed it to staging and production; the app now carries 540 active demand records and 214 records with monthly search counts, including expanded Real Estate demand coverage.

- Staging: `https://staging-assessment.northvalleyintel.com`
- Production: `https://assessment.northvalleyintel.com`
- Staging source branch: `staging`
- Production source branch: `main`

## Current BDD State

- Current generation: 44
- Critical unresolved: 0
- High unresolved: 0
- Low deferred: 2
- Two-pass verification: passed for demand satisfaction integration in Generations 38 and 39
- Self-QA gate: passed locally, in staging, and in production for Medina Clean demand satisfaction reports; Generation 41 local validation passed for Welding demand support; Generation 42 local, staging, and production validation passed for Senior Living demand support; Generation 44 local, staging, and production validation passed for the latest Keyword Planner demand sync

Machine-readable BDD state lives in:

- `.mde/bdd-index.json`
- `.mde/failing-bdds.json`
- `.mde/generations/`

## Latest MDE Portfolio Sync

- Date: 2026-06-12
- Scope: artifact-only sync into the central MDE portfolio memory.
- Product behavior changed: no
- Mission changed: no
- Files initialized: `.mde/outbox/portfolio-sync.json`, `.mde/outbox/events.jsonl`, `.mde/outbox/lessons.jsonl`, `.mde/outbox/impacts.jsonl`, `.mde/outbox/content-seeds.jsonl`, and `.mde/outbox/skill-update-candidates.jsonl`
- Central import target: `../mde`
- Applicable context packs: `pdf-generation`, `printable-artifacts`, and `ui-forms`
- Downstream project to monitor: `proposals`

## Latest Validation

- Format: passed
- Lint: passed
- Typecheck: passed
- Unit tests: 50 passed
- Integration tests: 6 passed
- Build: passed
- Cloudflare build: passed for Generation 44 on rerun with documented warnings
- Generation 41 focused tests: demand satisfaction and report structure passed
- Generation 41 demand sync: 216 active demand records copied from `demand-data-generation`, including 60 active Welding records and 33 records with Keyword Planner monthly searches
- Generation 41 report behavior: `Customer Demand Fit` can classify Welding sites, evaluate Welding demand records, and show estimated monthly searches when present
- Generation 42 focused tests: demand satisfaction and report structure passed
- Generation 42 demand sync: 276 active demand records copied from `demand-data-generation`, including 60 active Senior Living records and 34 Senior Living records with Keyword Planner monthly searches
- Generation 42 report behavior: `Customer Demand Fit` can classify Senior Living sites, evaluate Senior Living demand records, and show estimated monthly searches when present
- Generation 44 focused tests: demand satisfaction and report structure passed
- Generation 44 demand sync: 540 active demand records copied from `demand-data-generation`, including 290 Real Estate records, 147 Real Estate records with Keyword Planner monthly searches, and 214 total monthly-count records
- Generation 44 report behavior: `Customer Demand Fit` can classify Real Estate sites, evaluate 290 Real Estate demand records, and surface monthly-search opportunities when present
- Generation 44 built-package smoke check: Real Estate assessed with 290 records evaluated, 147 monthly-count records, and monthly-search opportunities available
- Generation 44 staging deployment: passed from `staging` commit `aa1521d`, Cloudflare version `c25c4775-3b6f-4de6-a243-61a21a7ae85a`
- Generation 44 production deployment: passed from `main` commit `a05bc24`, Cloudflare version `2758758c-5460-4a06-8c37-981f48a922c9`
- Latest local validation scan: `medinaclean-com-1781067349467`
- Latest local scan result: completed with 11 pages crawled, high evidence confidence, PageSpeed measured, demand satisfaction assessed as Cleaning demand, and demand opportunities rendered with pages checked, found evidence, and missing signals.
- Latest staging validation scan: `houseofmodernrealty-com-1781871484548`
- Latest staging scan result: completed with 8 pages crawled, high evidence confidence, Real Estate demand satisfaction, 290 demand records evaluated, 147 monthly-count records available, score 19/100, and monthly-search opportunity evidence rendered.
- Latest production validation scan: `houseofmodernrealty-com-1781871905812`
- Latest production scan result: completed with 8 pages crawled, high evidence confidence, Real Estate demand satisfaction, 290 demand records evaluated, 147 monthly-count records available, score 19/100, and monthly-search opportunity evidence rendered.
- Report page check: demand section present in rendered HTML with `Customer Demand Fit`, sector-specific demand labels, `What We Found`, `Demand Gaps To Review`, `Demand opportunities with evidence`, `Estimated monthly searches`, and `Pages checked`.
- Demand integration result: generated demand records remain owned by `demand-data-generation`; this app consumes the active dataset and evaluates how the specific website satisfies observable demand.
- Generation 43 public-readiness result: README now explains the mission, MDE artifact lanes, generations, validation, demand data contracts, and deployment discipline for a public GitHub audience.
- Generation 43 public-readiness scan: no committed private env files were found; `.env.example` contains only an empty `PAGESPEED_API_KEY` placeholder; no common private key, token, Cloudflare token, admin secret, or concrete PageSpeed key pattern was found in tracked files.
- Generation 43 GitHub visibility: public, verified for `Northvalley-Intelligence/local-website-growth-assessment`.

## Known Risks

- PageSpeed can fail or time out in Cloudflare Worker runtime. The report marks Performance unavailable and does not invent a score.
- Dedicated background execution is still needed for stronger production reliability.
- Production Phase 1 scans intentionally use a smaller bounded crawl profile than local full-report runs. Large sites may receive partial assessments until Phase 2 background execution is available.
- The consumed demand dataset is currently copied into the assessment app as a release artifact. A later release should automate syncing from the demand-data-generation repository to avoid stale demand inputs.
- Generation 44 demand support is deployed. Future sector updates still require manual artifact sync until automated publishing is added.
- Demand-sector inference is deterministic and conservative. Unsupported or unclear industries are skipped rather than forced into a misleading demand score.
- Turbopack tracing warning remains documented as acceptable for Phase 1 only.
- Authenticated API access, scheduled scans, PDF/shareable reports, and consultation CTA are Phase 2+ work.
- The mistaken personal GitHub repository still exists and should only be deleted with explicit founder approval.
- Once the repository is public, future commits must continue to keep credentials, private customer data, and unpublished client secrets out of git.

Detailed risk state lives in `.mde/risk-register.json`.

## Missing Founder Inputs

None required for current Phase 1 founder testing.

## Recommended Next Step

Founder review of staging or production reports for supported local-service sectors.

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
