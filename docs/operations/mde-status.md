# MDE Status

Last updated: 2026-06-09

## Founder Status Report

### Current Phase

Phase 1: Complete Vertical Slice

### Current Phase Goal

Build the first usable version: URL input to safe public crawl to signal extraction to scoring to report page.

### Current BDD Generation

Generation 32: second clean Cloudflare staging runtime verification.

### Scenario Counts

- Current generation Critical: 6
- Current generation High: 6
- Current generation Low: 0
- Current unresolved Critical: 0
- Current unresolved High: 0
- Current deferred Low: 1

### Newly Added Scenarios

- Critical: Given the same mission and Phase 1 goal, staging submission still accepts common bare business domains asynchronously.
- Critical: Given staging uses Cloudflare Workers, scan status and history still persist through D1-backed storage.
- Critical: Given a site has insufficient public evidence, staging still withholds the completed report and returns `insufficient_evidence`.
- Critical: Given a real public validation site is assessed, staging still produces a completed report with evidence-backed scores.
- Critical: Given crawl safety is required, staging still skips outside-domain links and records the decision.
- Critical: Given score explainability is required, report JSON still includes found evidence, missing evidence, factor explanations, confidence, and business impact.
- High: Automated gates still pass after the Generation 31 formatting fix.
- High: Cloudflare/OpenNext build still succeeds with documented warnings only.
- High: PageSpeed staging unavailability remains honest and does not fabricate Performance scoring.
- High: MDE telemetry records the Generation 31 failure/fix and Generation 32 clean pass.
- High: Production remains blocked until production-specific D1, secrets, route/DNS, and self-QA pass.
- High: No implementation code changes occurred between the Generation 31 post-fix pass and Generation 32 clean pass.

### Reused Scenarios

- Safe crawl boundaries, robots.txt, no form submission, max pages, max depth.
- Asynchronous submission with pending, running, completed, failed, and insufficient-evidence outcomes.
- Evidence sufficiency before report generation.
- Canonical apex/`www` redirect handling.
- Report hierarchy and decision-first presentation.
- Score explainability, category weighting, and confidence.
- Evidence traceability and business explainability.
- PageSpeed measured-score validation.
- MDE historical tracking.
- Testimonial-like customer proof detection.
- Trust Before Advice report flow.

### Newly Added Tests

- No new test files were added in Generation 32.
- Reused automated tests and staging API self-QA from Generation 31.

### Reused Tests

- `packages/shared/tests/foundation.test.ts`
- `packages/shared/tests/security.test.ts`
- `apps/worker/src/assessment.test.ts`
- `apps/web/src/app/reports/report-page-structure.test.ts`
- `apps/web/src/lib/scan-store.test.ts`
- `tests/integration/foundation-gate.test.ts`
- `tests/integration/phase1-pipeline.test.ts`
- Generation 27 evidence-detail regressions reused unchanged in Generation 28.

### Deferred Tests

- Centralized observability provider, dashboards, and alerts.
- Screenshot-based visual QA.
- Production persistent-store validation for `assessment.northvalleyintel.com`.
- Production persistent-store validation for `assessment.northvalleyintel.com`.
- Full PageSpeed API validation in staging/production.
- Automated generation of MDE history records.
- Automated Screaming Frog export comparison.

### Blockers

- Production deployment is founder-approved in principle, but still blocked by the release gate until production D1 storage, production PageSpeed secret, production route/DNS, and production self-QA are configured and validated.

### Known Risks

- `next build` passes but emits the documented Turbopack tracing warning from `apps/web/src/lib/scan-store.ts`.
- The local filesystem-backed scan store remains local-development only. Cloudflare staging now uses D1 through `ASSESSMENT_DB`.
- Visual review has been performed through HTML/API output inspection rather than browser screenshot review.
- Centralized observability export is deferred.
- Trust Signals testimonial detection is deterministic text-pattern detection. The Medina Clean false negative is fixed, but more testimonial/review layouts need recurring validation before this category can be called strong coverage.
- Broader public-suffix/domain-boundary handling is not implemented beyond safe apex/`www` canonical redirects.
- MDE history is manually maintained for Phase 1; automated telemetry export is deferred.
- Candidate validation sites were confirmed by the founder as non-client/non-prospect on 2026-06-06.
- Screaming Frog validation exports are manual unless tooling is added later.
- Page-based negative findings now show pages checked, but screenshot-based visual confirmation of presentation quality remains deferred.
- Cloudflare/OpenNext build passes, but it warns about the generated bundle not finding `../../tsconfig.base.json`; the Worker was still produced and deployed.
- Cloudflare Worker request lifetime can constrain full 25-page polite crawls plus PageSpeed. Generation 30 added a terminal execution watchdog; true production-grade long-running execution still needs dedicated background processing.
- One stale `pending` staging job remains in D1 from the pre-`waitUntil` deployment and is documented as pre-fix test data.

### Missing Founder Inputs

- Production Cloudflare DNS/route confirmation for `assessment.northvalleyintel.com`.
- Production D1 database decision/configuration. Staging uses Cloudflare D1 successfully; production should use a separate database.
- Production deployment approval has been given in principle, but production remains blocked until production-specific D1, secrets, route/DNS, and self-QA pass.

### Required Credentials Or Access

- `PAGESPEED_API_KEY` has been provided locally and is configured as a Cloudflare Worker secret for staging.
- Cloudflare production route/DNS access for `assessment.northvalleyintel.com`.
- Screaming Frog free desktop access if manual crawl exports are expected.
- Production D1 database and production `PAGESPEED_API_KEY` secret before `assessment.northvalleyintel.com` can deploy.

### External Dependencies Not Configured

- Google PageSpeed Insights API is configured and validated locally.
- Google PageSpeed Insights API is configured as a staging Cloudflare Worker secret. The successful Medina Clean staging report marked Performance unavailable because the deployed PageSpeed call did not complete within the staging runtime timeout.
- Google PageSpeed Insights API is not yet configured in production.
- Screaming Frog is not configured as an automated validation source; manual exports are optional and founder/tooling dependent.

Impact:

- Local Performance category has been validated through direct worker self-QA.
- Staging Performance findings are honest but incomplete when PageSpeed cannot be reached within the configured staging timeout.
- Production Performance findings remain incomplete until `PAGESPEED_API_KEY` is configured in production secrets.
- Full crawl-comparison validation against Screaming Frog remains unavailable until manual exports are provided.
- The report still avoids inventing performance evidence when the API key is missing in any environment.

### Self-QA Results

- Full local gate passed for Generation 28: format, lint, typecheck, unit tests, integration tests, and build.
- Unit tests passed: 35.
- Integration tests passed: 6.
- Build passed with the known Turbopack tracing warning.
- Direct All Square Homes worker self-QA with the local PageSpeed key crawled 17 pages and collected high-confidence evidence.
- PageSpeed returned successfully with a mobile score of 49/100.
- Performance category scored 49/100 with formula `PageSpeed mobile performance score = 49/100. Category weight: 5%. Weighted contribution: 2 points.`
- Top problems included Local Visibility, Performance, AI Discoverability, Security & Reliability, and Trust Signals; healthy Lead Conversion was not padded into the problem list.
- Customer-facing impact copy was inspected and no longer contains repeated `signals signals` wording.
- Local app self-QA submitted All Square Homes through the actual app API; the request returned `pending`, status moved to `running`, then completed with a report.
- Actual app API output showed 17 pages crawled, high-confidence evidence, PageSpeed 49/100, Performance 49/100, and top problems without healthy-category padding.
- Actual report page HTML showed Executive Summary, Biggest Opportunity, Top Recommended Actions, Score Summary, Supporting Evidence, Evidence Traceability, Detailed Findings, and measured Performance details.
- Generation 16 second clean gate passed with no implementation code changes after Generation 15.
- Generation 17 added validation docs for reference tools, validation matrix, candidate sites, and site-validation template.
- Self-review classified validation coverage as strong for safety/evidence sufficiency/PageSpeed explainability, medium for technical crawl/report areas, and weak for trust, clarity, AI discoverability, screenshot-based report quality, and trend tracking.
- Generation 18 verified the validation artifacts, MDE telemetry fields, missing-input surfacing, and full local gate with no implementation changes after Generation 17.
- Generation 19 ran all five recurring validation candidates.
- Validation found and fixed a false-positive scored report risk: Jimmy John's produced only 201 readable characters and now returns insufficient evidence instead of a scored F report.
- Post-fix validation rerun showed Orkin, Ace Hardware, and Anytime Fitness completed with traceable reports; Jimmy John's and Keller Williams correctly returned insufficient evidence.
- PageSpeed was intermittently unavailable during the post-fix run and was handled honestly as unavailable measurement.
- Generation 20 verified the validation run record, evidence-sufficiency fix, MDE telemetry fields, and full local gate with no implementation changes after Generation 19.
- Founder rejected All Square Homes as a recurring validation candidate, then rejected Baird & Warner because the suite already had real estate coverage; candidate 1 is now Orkin in `docs/validation/candidate-sites.md`.
- Founder confirmed the candidate validation sites are not current clients or active prospects.
- Founder selected the Screaming Frog free version for Phase 1 manual validation exports.
- Generation 21 fixed the Medina Clean URL input failure; `medinaclean.com`, `www.medinaclean.com`, and `https://medinaclean.com` now return `202 Accepted` locally, while unsafe/local inputs return `400 Bad Request`.
- Generation 22 verified URL-normalization tests, validation artifacts, MDE telemetry, and the full local gate with no implementation changes after Generation 21.
- Generation 23 updated the mission with Trust Before Advice, changed the report to show found evidence before missing items and recommendations, and made found phone/location evidence more specific.
- Generation 23 full gate passed: format, lint, typecheck, 28 unit tests, 6 integration tests, and build.
- Generation 23 fresh Medina Clean self-QA completed in the local app with 11 pages crawled, high-confidence evidence, grade B, and PageSpeed 75/100.
- Medina Clean Local Visibility now acknowledges phone evidence `+14704434817`, the `tel:+14704434817` call link, and multiple English/Spanish Woodstock service-area pages before listing the remaining Google Business connection gap.
- Fresh rendered report output showed `What We Found`, `What Still Needs Attention`, `What Is Missing`, `Machine-Readable Or Verifiable Signals`, and `Recommendation` in the intended customer-facing flow.
- Generation 24 verified Trust Before Advice artifacts, reused tests, and full local gate with no implementation changes after Generation 23.
- Generation 25 fixed Medina Clean testimonial detection by recognizing testimonial-like customer proof when review/customer context appears with customer-story language.
- Fresh Medina Clean self-QA after the fix completed with 11 pages crawled, high-confidence evidence, and Trust Signals now passing both `Testimonials` and `Reviews or ratings`.
- Generation 26 verified testimonial detection artifacts, reused tests, and the full local gate with no implementation changes after Generation 25.
- Generation 27 added the No Negative Finding Without Evidence mission rule and implemented factor-level evidence details.
- Generation 27 self-QA found and fixed an escaped image URL false-positive risk in Medina Clean report output.
- Generation 27 self-QA found and fixed duplicate passive asset checks that could slow live scans.
- Final Generation 27 Medina Clean local app self-QA completed with 11 pages crawled, high-confidence evidence, PageSpeed 62/100, and no broken internal image false positive.
- Rendered report HTML showed `Evidence reviewed`, `evidence-detail-list`, pages checked, and no stale `Broken internal images were found` claim.
- Generation 28 verified the same mission and phase goal with no implementation changes after Generation 27.
- Cloudflare staging DNS now resolves and reaches the deployed Worker.
- Generation 30 first staging submit reproduced a Critical runtime failure: `/api/scans` returned 500 because the filesystem-backed scan store was incompatible with Cloudflare Workers.
- Fix made: scan storage now uses Cloudflare D1 through `ASSESSMENT_DB` in staging and keeps the JSON file store for local development/tests.
- Generation 30 second staging submit reproduced a Critical async execution failure: jobs stayed `pending` because `setTimeout` was not reliable background execution in the Worker request lifecycle.
- Fix made: Cloudflare runtime queue handoff now uses `ExecutionContext.waitUntil`; local Next development keeps `setTimeout`.
- Generation 30 third staging self-QA found long-running scans could stay `running` near the Worker execution window.
- Fix made: staging/Worker execution now has a terminal watchdog so long scans fail truthfully instead of hanging.
- Final staging self-QA passed:
  - `POST /api/scans` with `example.com` returned `202 pending`.
  - `GET /api/scans/example-com-1780974896397` returned `insufficient_evidence` with no report.
  - `POST /api/scans` with `medinaclean.com` returned `202 pending`.
  - `GET /api/scans/medinaclean-com-1780974928316` returned `completed`.
  - Medina Clean staging report crawled 11 pages, skipped outside-domain YouTube/North Valley links, produced grade `C`, overall score `79`, high evidence confidence, and evidence-backed category details.
  - Performance was marked unavailable because PageSpeed could not be reached within staging runtime constraints; no performance score was fabricated.
- Staging Worker version validated: `2bf3d06a-a857-4423-a340-b88a07455484`.
- Generation 31 fresh verification initially failed on formatting drift in `apps/web/src/app/api/scans/route.ts`, `apps/web/src/lib/scan-store.ts`, and `apps/web/src/lib/scan-store.test.ts`.
- Generation 31 fix: ran Prettier formatting only. No behavior changed.
- Generation 31 post-fix gates passed: format, lint, typecheck, 35 unit tests, 6 integration tests, normal build, and Cloudflare/OpenNext build.
- Generation 31 staging self-QA passed: `example.com` reached `insufficient_evidence`; `medinaclean.com` reached `completed` with 11 pages crawled, high confidence, grade `C`, score `79`, and outside-domain links skipped.
- Generation 32 second clean gates passed with no implementation code changes after the Generation 31 formatting fix: format, lint, typecheck, 35 unit tests, 6 integration tests, normal build, and Cloudflare/OpenNext build.
- Generation 32 staging verification passed by rechecking terminal D1-backed staging records: `example-com-1780975606028` remained `insufficient_evidence`; `medinaclean-com-1780975624607` remained `completed` with evidence-backed report output; `/admin` returned HTTP 200.
- Accidental Vercel project link files were removed from the repo; Cloudflare is the deployment path.
- Generated Cloudflare/OpenNext artifacts are ignored by Git, Prettier, ESLint, and Vitest so source validation does not scan deployment output.
- Final post-deploy gate passed: format, lint, typecheck, 35 unit tests, 6 integration tests, normal build, and Cloudflare/OpenNext build.
- API surface is documented in `docs/engineering/api.md`: create scan, list scans, get status/report JSON, and view report. External API hardening, scheduled scans, authentication, and PDF downloads remain Phase 2/production-readiness work.

### Phase Readiness Assessment

Phase 1 is **phase-ready for staging** after Generation 32. Generation 31 found and fixed a formatting gate failure, then Generation 32 passed as the second clean verification with no implementation code changes.

Staging is runtime-validated for submit, status, history, insufficient evidence, and completed report behavior. Production remains blocked until production-specific D1, secrets, route/DNS, deploy, and self-QA are configured and validated.

### Recommendation

Prepare production gate work; do not deploy production until the production-specific gate passes.

Next actions:

- Keep staging available for founder testing at `https://staging-assessment.northvalleyintel.com`.
- Configure separate production D1 storage, production PageSpeed secret, and `assessment.northvalleyintel.com` route/DNS.
- Run production deploy and production self-QA only after those production resources are configured.
- Run Screaming Frog free manual exports later if deeper crawl comparison is needed.
- Keep production PageSpeed secret configuration visible until deployment secrets are set.
- Do not deploy production until production durable storage, secrets, DNS/route, deploy, and self-QA pass.
- Continue maintaining append-only history under `docs/operations/mde-history/`.

## Current Phase

Phase 1: Complete Vertical Slice

## Current Phase Goal

Build the first usable version: URL input to safe public crawl to signal extraction to scoring to report page.

## Current BDD Generation

Generation 28: second clean no-negative-finding-without-evidence verification.

## Generated BDD Scenarios

### Generation 7: Report Organization And Presentation

#### Critical

- G7-C1: Given a completed assessment report, when a business owner opens it, then the first screen communicates the overall situation through an Executive Summary and lead readiness score.
- G7-C2: Given a completed report, when recommendations are reviewed, then the Biggest Opportunity and Top Recommended Actions appear before detailed diagnostics.
- G7-C3: Given a completed report, when a business owner scans it for about one minute, then they can identify what is working, what is not working, what matters most, and what should be fixed first.
- G7-C4: Given detailed scoring evidence exists, when the report is rendered, then diagnostic details are available without overwhelming the primary decision path.
- G7-C5: Given a consultant presents the report, when they walk through the page, then the hierarchy supports a professional business assessment rather than an engineering audit.
- G7-C6: Given score explainability is required, when scores appear in the summary, then details remain reviewable in the supporting/detailed sections.

#### High

- G7-H1: Given visual elements are used, when the report is reviewed, then scorecards, priority indicators, and impact indicators improve understanding rather than decorate the page.
- G7-H2: Given report output is reviewed, when technical metadata appears, then it is placed after decision-oriented sections.
- G7-H3: Given the report is customer-facing, when content density is evaluated, then walls of text, excessive gauges, and unexplained numbers are avoided.

### Generation 8: Second Clean Report Presentation Verification

#### Critical

- G8-C1: Given the same mission and Phase 1 goal, when the report is reviewed fresh, then the section order is Executive Summary, Biggest Opportunity, Top Recommended Actions, Score Summary, Supporting Evidence, and Detailed Findings.
- G8-C2: Given the report is a customer deliverable, when actual HTML output is inspected, then recommendations appear before detailed score formulas and diagnostics.
- G8-C3: Given a small business owner reads the report, when they scan the top sections, then they can identify the main opportunity and first actions without interpreting engineering metadata.
- G8-C4: Given a consultant presents the report, when they move from summary to evidence, then the page supports a clear narrative with expandable details.

#### High

- G8-H1: Given the UI uses visual elements, when actual output is reviewed, then scorecards and priority labels clarify importance.
- G8-H2: Given detailed diagnostics remain necessary, when they are reviewed, then they are grouped under expandable Detailed Findings.
- G8-H3: Given tests run, when report structure changes, then section order regression is caught.

### Generation 9: Turbopack Warning And Storage Risk Classification

#### Critical

- G9-C1: Given `next build` emits a Turbopack tracing warning from filesystem-backed scan storage, when Phase 1 readiness is assessed, then the warning is documented as a known implementation risk rather than ignored.
- G9-C2: Given Phase 1 uses local filesystem-backed storage, when the risk is accepted, then acceptance is conditional on passing build, passing tests, working local/staging runtime behavior, documentation in MDE status and known limitations, and a Phase 2 or production-ready persistent-store replacement.
- G9-C3: Given a build passes with the Turbopack warning, when production readiness is evaluated, then the project does not treat that build as fully production-ready.

#### High

- G9-H1: Given release gates are reviewed, when storage readiness is inspected, then production remains blocked until filesystem-backed local storage is replaced with a proper persistent store.
- G9-H2: Given future phase planning is reviewed, when Phase 2 or production readiness is considered, then persistent storage replacement is listed as required work.

### Generation 10: Evidence Sufficiency And Report Trustworthiness

#### Critical

- G10-C1: Given a submitted website produces zero crawled pages, when assessment execution completes, then the system must not generate a normal scored customer-facing report.
- G10-C2: Given crawl or DNS failure prevents meaningful public page evidence collection, when status is checked, then the assessment is marked insufficient evidence rather than completed.
- G10-C3: Given content extraction reaches pages but extracts no meaningful readable text, when scoring would run, then scoring is blocked and the report is withheld.
- G10-C4: Given a report is generated from limited evidence, when a customer reads it, then the report clearly labels the assessment as partial and shows confidence limitations.
- G10-C5: Given the All Square Homes assessment is traced, when network access is available, then crawl, extraction, scoring, and report generation collect actual website evidence instead of producing a zero-page report.

#### High

- G10-H1: Given category scores are shown, when evidence is partial, then category confidence reflects the limited evidence.
- G10-H2: Given an operator reviews an insufficient-evidence scan, when they inspect status, then crawl failure reasons are visible without leaking secrets.
- G10-H3: Given release gates are reviewed, when Phase 1 readiness is claimed, then evidence sufficiency is a required gate.

### Generation 11: Second Clean Evidence Sufficiency Verification

#### Critical

- G11-C1: Given the same mission and Phase 1 goal, when a zero-page crawl is reviewed fresh, then it cannot produce a normal scored report.
- G11-C2: Given an assessment cannot collect meaningful evidence, when the web status is reviewed, then the outcome is visibly insufficient evidence with no report payload.
- G11-C3: Given a real crawlable site is assessed, when enough evidence is collected, then scoring and report generation proceed with evidence quality metadata.
- G11-C4: Given partial evidence is collected, when a report is shown, then confidence and limitations remain visible.

#### High

- G11-H1: Given insufficient-evidence errors include adapter details, when they are surfaced, then secrets are redacted.
- G11-H2: Given release status is reviewed, when readiness is claimed, then the evidence sufficiency gate and All Square Homes validation are recorded.

### Generation 12: Canonical Redirect Boundary

#### Critical

- G12-C1: Given a submitted apex domain redirects to its `www` hostname, when crawling follows the redirect, then the crawler treats it as the same submitted website rather than outside-domain evidence loss.
- G12-C2: Given a submitted `www` domain redirects to its apex hostname, when crawling follows the redirect, then the crawler treats it as the same submitted website rather than outside-domain evidence loss.
- G12-C3: Given a submitted site redirects to an unrelated hostname, when crawling follows the redirect, then the crawler still blocks it as outside the submitted domain.

#### High

- G12-H1: Given All Square Homes is submitted as the apex URL, when the updated worker runs, then it crawls meaningful pages and produces evidence quality instead of `insufficient_evidence`.

### Generation 13: Second Clean Canonical Redirect Verification

#### Critical

- G13-C1: Given the same mission and Phase 1 goal, when apex-to-`www` redirect handling is reviewed fresh, then it remains allowed as the same submitted website.
- G13-C2: Given unrelated-domain redirect protection is reviewed fresh, then it remains blocked.
- G13-C3: Given the local gate runs after code freeze, then canonical redirect handling has no unresolved Critical or High failures.

#### High

- G13-H1: Given All Square Homes apex validation is reviewed, then the latest trace remains a successful evidence-collecting assessment rather than insufficient evidence.

### Generation 14: Evidence Traceability And Business Explainability

#### Critical

- G14-C1: Given a category score appears in the report, when a business owner reads the score summary, then the passed and missing checks are visible near the summary.
- G14-C2: Given a missing signal appears, when a business owner reads it, then the report explains why the missing signal matters in business language.
- G14-C3: Given existing content may serve a similar human-facing purpose, when an additional signal is recommended, then the report explains the difference between existing content and the recommended signal.
- G14-C4: Given score details are reviewed, when a customer asks why they received the score, then factor-level check name, pass/fail result, evidence, business explanation, existing-content note, and next action are available.

#### High

- G14-H1: Given LocalBusiness schema is missing, when the report explains it, then the explanation distinguishes human-readable business content from machine-readable business information.
- G14-H2: Given Google Business connection is missing, when the report explains it, then the explanation connects the website to local reputation and reviews in business language.
- G14-H3: Given PageSpeed is unavailable, when the report explains it, then it says performance measurement was unavailable and does not imply a measured performance defect.

### Generation 15: PageSpeed Validation, Measured Performance Scoring, And MDE Historical Tracking

#### Critical

- G15-C1: Given PageSpeed is configured but slower than normal crawl fetches, when performance measurement runs, then it uses a PageSpeed-specific bounded timeout rather than the crawl request timeout.
- G15-C2: Given PageSpeed is unavailable or fails, when scoring runs, then Performance is marked `Not measured`, excluded from the overall score, and excluded from top business problems.
- G15-C3: Given PageSpeed succeeds with a measured mobile score, when scoring runs, then Performance uses the measured score rather than scoring 100 for measurement presence.
- G15-C4: Given fewer than five categories are weak, when top business problems are generated, then healthy categories are not padded into the problem list.
- G15-C5: Given MDE progress must be observable historically, when a session changes mission, BDDs, tests, implementation, or readiness, then append-only history records capture what changed and why.

#### High

- G15-H1: Given the local PageSpeed key is configured, when status is reported, then local validation is shown separately from missing staging/production secrets.
- G15-H2: Given customer-facing impact copy is generated, when reports are inspected, then category wording is professional and does not contain repeated or awkward phrases.
- G15-H3: Given scoring docs are reviewed, when external measurements are unavailable or measured, then the scoring model explains how those states affect overall score and category score.
- G15-H4: Given future case-study publication is desired, when history is reviewed, then records make it possible to reconstruct phase, mission, BDD, test, implementation, self-QA, and readiness evolution.

### Generation 16: Second Clean PageSpeed, Report, And MDE History Verification

#### Critical

- G16-C1: Given the actual app receives a website URL, when the submit request returns, then it creates trackable assessment work immediately and does not wait for crawl/PageSpeed completion.
- G16-C2: Given the actual app assessment is executing, when status is polled, then it truthfully shows pending/running/completed and only exposes the report after completion.
- G16-C3: Given PageSpeed succeeds in the actual app run, when the report is inspected, then Performance score, evidence, formula, and business explanation match the measured PageSpeed score.
- G16-C4: Given the actual report page is inspected, when a business owner reads it, then recommendations appear before diagnostics and score summaries show passed/missing checks.
- G16-C5: Given MDE history is reviewed, when Generation 16 completes, then the status and history records show two clean generations with no implementation code changes between them.

#### High

- G16-H1: Given the second clean gate runs, when automated checks complete, then format, lint, typecheck, unit tests, integration tests, and build pass.
- G16-H2: Given All Square Homes is submitted through the app, when the assessment completes, then it collects meaningful evidence and does not show stale insufficient-evidence behavior.
- G16-H3: Given local readiness is reported, when staging and production are not validated, then those blockers remain prominent.
- G16-H4: Given build passes with the Turbopack warning, when readiness is assessed, then the warning remains documented as acceptable for Phase 1 local/staging only.

### Generation 17: Competitive Validation Strategy And Telemetry

#### Critical

- G17-C1: Given Phase 1 uses validation references, when docs are reviewed, then Lighthouse, PageSpeed Insights, Screaming Frog, and HubSpot Website Grader are documented with strengths, gaps, openness, cost, API-key needs, suitability, and limitations.
- G17-C2: Given validation references are documented, when architecture is reviewed, then production dependencies are clearly separated from development-time validation references.
- G17-C3: Given scoring categories exist, when the validation matrix is reviewed, then every scoring/report category has an authoritative validation source and supporting validation sources.
- G17-C4: Given recurring validation is required, when candidate sites are reviewed, then five public non-client/non-prospect candidate sites are documented with industry, reason, validation value, robots considerations, and notes.
- G17-C5: Given validation runs need telemetry, when the site-validation template is reviewed, then it captures our assessment against Lighthouse, PageSpeed, Screaming Frog, and manual expert review with false positives, false negatives, score disagreements, report quality, and confidence.
- G17-C6: Given MDE progress must show quality trends, when status/history are reviewed, then validation runs and trend fields are part of the MDE reporting process.

#### High

- G17-H1: Given validation dependencies are missing, when status is reviewed, then missing founder inputs and external dependencies are prominent.
- G17-H2: Given score explainability is part of the mission, when validation is reviewed, then score explainability has explicit validation coverage.
- G17-H3: Given the report is customer-facing, when validation is reviewed, then report quality has explicit validation coverage.
- G17-H4: Given competitor tools are referenced, when docs are reviewed, then they are framed as validation references only and not feature-copying targets.
- G17-H5: Given Phase 1 readiness changed, when status is reviewed, then readiness is reset until the validation strategy gate gets a second clean pass.

### Generation 18: Second Clean Competitive Validation Verification

#### Critical

- G18-C1: Given the same mission and Phase 1 goal, when reference-tool docs are reviewed fresh, then Lighthouse, PageSpeed Insights, Screaming Frog, and HubSpot Website Grader remain documented with strengths, gaps, openness, cost, API-key needs, suitability, and limitations.
- G18-C2: Given the same mission and Phase 1 goal, when architecture boundaries are reviewed fresh, then production dependencies remain clearly separated from validation references.
- G18-C3: Given scoring categories are reviewed fresh, when the validation matrix is inspected, then every scoring/report category still has validation coverage.
- G18-C4: Given recurring validation is reviewed fresh, when candidate sites and the site-validation template are inspected, then recurring sites and run telemetry fields remain present.
- G18-C5: Given MDE telemetry is reviewed fresh, when status/history are inspected, then validation-run and trend tracking requirements remain visible.
- G18-C6: Given the second clean gate runs, when validation artifacts and automated checks are verified, then no unresolved Critical validation-strategy failures remain.

#### High

- G18-H1: Given automated checks run after the second clean generation, then format, lint, typecheck, unit tests, integration tests, and build pass.
- G18-H2: Given missing validation dependencies remain, when status is reviewed, then founder inputs and external dependencies remain prominent.
- G18-H3: Given score explainability and report quality are reviewed fresh, then they remain explicit validation categories.
- G18-H4: Given local readiness is reported, when staging and production are not validated, then those blockers remain visible.
- G18-H5: Given build passes with the Turbopack warning, when readiness is assessed, then the warning remains documented as acceptable for Phase 1 local/staging only.

### Generation 19: Recurring Competitive Validation Run And Thin-Evidence Fix

#### Critical

- G19-C1: Given the recurring validation suite is ready, when validation runs, then Orkin, Ace Hardware, Anytime Fitness, Jimmy John's, and Keller Williams are exercised and recorded.
- G19-C2: Given a public site yields extremely thin readable text, when evidence sufficiency is evaluated, then the system withholds the scored report as insufficient evidence.
- G19-C3: Given a site has insufficient evidence, when status/report output is generated, then a normal customer-facing scored report is not presented.
- G19-C4: Given validation telemetry is recorded, when the run is reviewed, then matched findings, missed findings, false positives, false negatives, report quality, and score explainability observations are visible.
- G19-C5: Given PageSpeed is unavailable during validation, when Performance is evaluated, then it remains unavailable rather than becoming a measured defect.
- G19-C6: Given validation finds a scoring trust issue, when it is fixed, then a regression test protects the behavior.

#### High

- G19-H1: Given a candidate site shows unusual runtime behavior, when validation is documented, then runtime risk is recorded.
- G19-H2: Given Screaming Frog and HubSpot outputs are unavailable, when validation is documented, then missing reference comparisons are explicit.
- G19-H3: Given automated checks run after validation-driven changes, then format, lint, typecheck, unit tests, integration tests, and build pass.
- G19-H4: Given MDE history is reviewed, then the validation run and evidence-sufficiency correction are recorded.
- G19-H5: Given code changed in Generation 19, then Phase 1 readiness resets until a second clean generation passes.

### Generation 20: Second Clean Post-Validation Verification

#### Critical

- G20-C1: Given the same mission and Phase 1 goal, when evidence sufficiency is reviewed fresh, then extremely thin readable text remains insufficient for a scored report.
- G20-C2: Given the recurring validation run is reviewed fresh, then Jimmy John's and Keller Williams remain recorded as insufficient evidence outcomes.
- G20-C3: Given validation telemetry is reviewed fresh, then matched findings, missed findings, false positives, false negatives, report quality, and score explainability observations remain visible.
- G20-C4: Given PageSpeed is unavailable during validation, when documentation and tests are reviewed, then unavailable measurement remains distinct from measured defects.
- G20-C5: Given the second clean gate runs, when validation artifacts and automated checks are verified, then no unresolved Critical post-validation failures remain.
- G20-C6: Given MDE status/history are reviewed, then the two-pass result after Generation 19 is recorded.

#### High

- G20-H1: Given automated checks run after the second clean generation, then format, lint, typecheck, unit tests, integration tests, and build pass.
- G20-H2: Given runtime anomaly and missing-reference gaps remain, when status is reviewed, then they remain documented.
- G20-H3: Given local readiness is reported, when staging and production are not validated, then those blockers remain visible.
- G20-H4: Given build passes with the Turbopack warning, when readiness is assessed, then the warning remains documented as acceptable for Phase 1 local/staging only.
- G20-H5: Given Screaming Frog free comparison is deferred, when architecture is reviewed, then it remains a validation reference rather than a production dependency.

### Generation 21: Common Business-Domain URL Input Normalization

#### Critical

- G21-C1: Given a user enters `medinaclean.com`, when the assessment is submitted, then the system accepts it and normalizes it to `https://medinaclean.com/`.
- G21-C2: Given a user enters `www.medinaclean.com`, when the assessment is submitted, then the system accepts it and normalizes it to `https://www.medinaclean.com/`.
- G21-C3: Given a user enters `https://medinaclean.com`, when the assessment is submitted, then the system accepts it unchanged as a safe HTTPS URL.
- G21-C4: Given a user enters unsafe schemes such as `file://`, `javascript:`, `data:`, or `ftp://`, when validation runs, then the system rejects them.
- G21-C5: Given a user enters localhost, a private IP, or a malformed domain, when validation runs, then the system rejects it.
- G21-C6: Given a non-technical user types a normal business domain in the form, when browser validation runs, then the input field does not block submission before server normalization.

#### High

- G21-H1: Given validation fails, when the API returns an error, then copy says a public business website like `example.com` or `https://example.com` is acceptable.
- G21-H2: Given Medina Clean exposed a false negative, when MDE telemetry is reviewed, then Detection Accuracy records the false negative and fix.
- G21-H3: Given automated checks run after the URL normalization change, then format, lint, typecheck, unit tests, integration tests, and build pass.
- G21-H4: Given local API self-QA runs, then accepted and rejected cases are verified with HTTP status codes.
- G21-H5: Given code changed in Generation 21, then Phase 1 readiness resets until a second clean generation passes.

### Generation 22: Second Clean URL-Normalization Verification

#### Critical

- G22-C1: Given the same mission and Phase 1 goal, when URL validation is reviewed fresh, then `medinaclean.com` remains accepted and normalized.
- G22-C2: Given the same mission and Phase 1 goal, when URL validation is reviewed fresh, then `www.medinaclean.com` remains accepted and normalized.
- G22-C3: Given HTTPS input is reviewed fresh, then `https://medinaclean.com` remains accepted.
- G22-C4: Given unsafe/local/malformed input is reviewed fresh, then unsafe schemes, localhost, private IPs, and malformed domains remain rejected.
- G22-C5: Given the report form is reviewed fresh, then browser validation does not block normal business-domain text.
- G22-C6: Given the second clean gate runs, then no unresolved Critical URL input failures remain.

#### High

- G22-H1: Given validation error copy is reviewed fresh, then it remains aligned with accepted input forms.
- G22-H2: Given Detection Accuracy telemetry is reviewed fresh, then the Medina Clean false negative remains documented.
- G22-H3: Given automated checks run after the second clean generation, then format, lint, typecheck, unit tests, integration tests, and build pass.
- G22-H4: Given local readiness is reported, then staging and production blockers remain visible.
- G22-H5: Given HTTP fallback is not implemented, then it remains documented as a future enhancement rather than hidden.

### Generation 23: Trust Before Advice Report Credibility

#### Critical

- G23-C1: Given a report includes found evidence, when the business owner reviews the biggest opportunity, then the report shows what was found before what still needs attention and before the recommendation.
- G23-C2: Given a category has missing signals, when detailed findings are reviewed, then found evidence, missing evidence, machine-readable or verifiable signal gaps, and recommendations are separated.
- G23-C3: Given a website has a `tel:` link, when signals are extracted and scored, then phone/contact evidence is acknowledged instead of being reported as absent.
- G23-C4: Given a website has crawlable city or service-area pages, when Local Visibility is scored, then found evidence includes concrete page examples.
- G23-C5: Given the report gives advice, when self-QA reviews it from a business-owner perspective, then recommendations do not appear to ignore existing evidence.

#### High

- G23-H1: Given report structure changes, when tests run, then found-before-missing-before-recommendation order is protected.
- G23-H2: Given evidence examples are available, when worker tests inspect category evidence, then phone and location examples appear in found evidence.
- G23-H3: Given the mission changed, when MDE telemetry is reviewed, then Trust Before Advice is recorded in mission evolution, status, progress, and generation history.
- G23-H4: Given implementation changed in Generation 23, when readiness is assessed, then local Phase 1 readiness resets until a second clean generation passes.

### Generation 24: Second Clean Trust Before Advice Verification

#### Critical

- G24-C1: Given the same mission and Phase 1 goal, when the biggest opportunity is reviewed fresh, then found evidence remains before missing items and recommendations.
- G24-C2: Given detailed findings are reviewed fresh, then found evidence, missing evidence, machine-readable or verifiable signal gaps, recommendations, and score calculation remain separated.
- G24-C3: Given phone evidence from a `tel:` link is reviewed fresh, then it remains acknowledged as found evidence.
- G24-C4: Given city/service-area page examples are reviewed fresh, then they remain visible in found Local Visibility and AI Discoverability evidence.
- G24-C5: Given the second clean gate runs, then no unresolved Critical Trust Before Advice failures remain.

#### High

- G24-H1: Given automated checks run after the second clean generation, then format, lint, typecheck, unit tests, integration tests, and build pass.
- G24-H2: Given MDE telemetry is reviewed fresh, then Trust Before Advice remains recorded in status, history, progress, and mission docs.
- G24-H3: Given local readiness is reported, then staging and production blockers remain visible.
- G24-H4: Given the Turbopack warning remains, then it remains documented as acceptable for Phase 1 local/staging only and not production-ready.

### Generation 25: Testimonial-Like Customer Proof Detection

#### Critical

- G25-C1: Given customer review cards include named reviewers, star labels, and narrative recommendation language, when Trust Signals are extracted, then testimonial-like customer proof is detected.
- G25-C2: Given review/rating evidence exists, when testimonial-like proof is detected, then review/rating detection remains separate and still passes.
- G25-C3: Given Medina Clean previously produced a testimonial false negative, when a fresh assessment runs, then Trust Signals marks both Testimonials and Reviews or ratings as found.
- G25-C4: Given implementation changed in Generation 25, when readiness is assessed, then local readiness resets until a second clean generation passes.

#### High

- G25-H1: Given the regression suite runs, then testimonial-like review-card content is covered by unit tests.
- G25-H2: Given validation records are reviewed, then the Medina Clean testimonial false negative is marked fixed with remaining deterministic limitations.
- G25-H3: Given Trust Signals validation is reviewed, then coverage remains medium until more testimonial/review layouts are validated.
- G25-H4: Given automated checks run after the fix, then format, lint, typecheck, unit tests, integration tests, and build pass.

### Generation 26: Second Clean Testimonial Detection Verification

#### Critical

- G26-C1: Given the same mission and Phase 1 goal, when testimonial-like customer proof detection is reviewed fresh, then the review-card regression remains covered.
- G26-C2: Given review/rating detection is reviewed fresh, then it remains separate from testimonial-like customer proof detection.
- G26-C3: Given Medina Clean validation is reviewed fresh, then the corrected false negative remains recorded.
- G26-C4: Given the second clean gate runs, then no unresolved Critical testimonial detection failures remain.

#### High

- G26-H1: Given automated checks run after the second clean generation, then format, lint, typecheck, unit tests, integration tests, and build pass.
- G26-H2: Given validation coverage is reviewed fresh, then Trust Signals remains medium coverage with remaining deterministic limitations visible.
- G26-H3: Given local readiness is reported, then staging and production blockers remain visible.
- G26-H4: Given the Turbopack warning remains, then it remains documented as acceptable for Phase 1 local/staging only and not production-ready.

### Generation 5: Async Submission And Score Explainability

#### Critical

- G5-C1: Given a business owner submits a URL, when the request is accepted, then the server creates trackable assessment work immediately and returns a pending status without waiting for the crawl to finish.
- G5-C2: Given an assessment has been queued, when execution starts, then status changes from pending to running.
- G5-C3: Given assessment execution completes successfully, when the user checks status, then status is completed and the report is available.
- G5-C4: Given assessment execution fails, when the user checks status, then status is failed and no report is presented as complete.
- G5-C5: Given a report is not complete, when the user opens the report URL, then the UI shows truthful status instead of pretending a report exists.
- G5-C6: Given a category score is shown, when North Valley Intel or a customer reviews it, then the score includes found evidence, missing evidence, factor contribution, formula, weight, business impact, and recommended fix.
- G5-C7: Given scoring evidence is incomplete, when a score is generated, then confidence and limitations are visible enough to avoid black-box certainty.

#### High

- G5-H1: Given an operator opens scan history, when jobs are pending, running, completed, or failed, then the admin view shows status for each job.
- G5-H2: Given a completed report is rendered, when a category score appears, then the UI shows how the score was calculated.
- G5-H3: Given product or engineering docs are reviewed, when scoring is inspected, then categories, weights, factors, limitations, and confidence are documented.

### Generation 6: Second Clean Verification After Code Freeze

#### Critical

- G6-C1: Given the same Phase 1 mission and goal, when URL submission is reviewed fresh, then long-running assessment work is asynchronous and the submit request does not block on crawling.
- G6-C2: Given an assessment job exists, when status is checked, then pending, running, completed, and failed are represented honestly.
- G6-C3: Given a report is incomplete, when the report route is opened, then a status view appears and report content is withheld until completion.
- G6-C4: Given category scores are reviewed fresh, when a customer asks why a score was assigned, then factor-level evidence, formula, category weight, contribution, business impact, and improvement guidance are available.
- G6-C5: Given existing locally stored reports are loaded, when they predate score explainability fields, then the system normalizes them so score explanations are still available.
- G6-C6: Given end-to-end output is reviewed, when the API and UI are inspected, then async status and score explanation behavior are visible in actual output.

#### High

- G6-H1: Given scan history is reviewed, when jobs are listed, then status is visible and completed scans remain accessible.
- G6-H2: Given the scoring model is reviewed, when docs are inspected, then scoring categories, weights, factor model, formula, limitations, and confidence are documented.
- G6-H3: Given repeated skipped URLs appear in a report, when the UI renders them, then list keys remain stable and no duplicate-key warning is produced.

### Critical

- C1: Given a submitted site is slow or unresponsive, when the crawler requests a page, then the request times out within a configured limit and the report explains the failed page without blocking the whole assessment.
- C2: Given a page response is very large, when the crawler reads it, then response size is bounded and oversized content is truncated safely.
- C3: Given many links are discovered quickly, when crawling proceeds, then Phase 1 uses an explicit bounded concurrency policy of one request at a time.
- C4: Given robots.txt, private/admin path rules, same-domain rules, max pages, and max depth apply, when a request is considered, then the decision is observable as crawled, skipped, or failed with a reason.
- C5: Given PageSpeed, crawl fetches, or report generation fail partially, when a report is generated, then the report distinguishes measured evidence from skipped or unavailable evidence and does not invent certainty.
- C6: Given assessment events are emitted, when they include error messages or URL-like values, then secrets are redacted before they leave the worker.
- C7: Given tests validate the crawler, when they run, then they include realistic mocked sites with robots exclusions, broken pages, forms, external links, non-HTML/passive checks, timeouts, oversized responses, redirects, and partial evidence.

### High

- H1: Given redirects cross to another domain, when crawling proceeds, then the redirected page is skipped and the submitted-domain boundary is preserved.
- H2: Given an operator reviews a scan, when they inspect scan metadata, then they can see duration, pages crawled, skipped URL reasons, PageSpeed status, adapter failures, response limits, timeout limits, and concurrency policy.
- H3: Given repeated local scans occur, when in-memory scan history grows, then it is bounded by policy.

### Low

- L1: Given a staging deployment is live, when operational incidents occur, then structured events are exported to a centralized observability provider with dashboards and alerts.

## Scenario Counts

- Generation 7 Critical: 6
- Generation 7 High: 3
- Generation 7 Low: 0
- Generation 8 Critical: 4
- Generation 8 High: 3
- Generation 8 Low: 0
- Generation 9 Critical: 3
- Generation 9 High: 2
- Generation 9 Low: 0
- Generation 10 Critical: 5
- Generation 10 High: 3
- Generation 10 Low: 0
- Generation 11 Critical: 4
- Generation 11 High: 2
- Generation 11 Low: 0
- Generation 12 Critical: 3
- Generation 12 High: 1
- Generation 12 Low: 0
- Generation 13 Critical: 3
- Generation 13 High: 1
- Generation 13 Low: 0
- Generation 14 Critical: 4
- Generation 14 High: 3
- Generation 14 Low: 0
- Generation 15 Critical: 5
- Generation 15 High: 4
- Generation 15 Low: 0
- Generation 16 Critical: 5
- Generation 16 High: 4
- Generation 16 Low: 0
- Generation 17 Critical: 6
- Generation 17 High: 5
- Generation 17 Low: 0
- Generation 18 Critical: 6
- Generation 18 High: 5
- Generation 18 Low: 0
- Generation 19 Critical: 6
- Generation 19 High: 5
- Generation 19 Low: 0
- Generation 20 Critical: 6
- Generation 20 High: 5
- Generation 20 Low: 0
- Generation 21 Critical: 6
- Generation 21 High: 5
- Generation 21 Low: 0
- Generation 22 Critical: 6
- Generation 22 High: 5
- Generation 22 Low: 0
- Generation 23 Critical: 5
- Generation 23 High: 4
- Generation 23 Low: 0
- Generation 24 Critical: 5
- Generation 24 High: 4
- Generation 24 Low: 0
- Generation 25 Critical: 4
- Generation 25 High: 4
- Generation 25 Low: 0
- Generation 26 Critical: 4
- Generation 26 High: 4
- Generation 26 Low: 0
- Generation 27 Critical: 7
- Generation 27 High: 6
- Generation 27 Low: 0
- Generation 28 Critical: 6
- Generation 28 High: 5
- Generation 28 Low: 0
- Generation 5 Critical: 7
- Generation 5 High: 3
- Generation 5 Low: 0
- Generation 6 Critical: 6
- Generation 6 High: 3
- Generation 6 Low: 0
- Current unresolved Critical: 0
- Current unresolved High: 0
- Current deferred Low: 1

## Scenarios Passing

- G7-C1: Covered by report UI hero with `Executive Summary` and `Lead readiness`.
- G7-C2: Covered by report UI ordering and `apps/web/src/app/reports/report-page-structure.test.ts`.
- G7-C3: Covered by self-QA from small business owner perspective.
- G7-C4: Covered by expandable `Detailed Findings` sections.
- G7-C5: Covered by self-QA from consultant-presenter perspective.
- G7-C6: Covered by score summary plus expandable score calculation details.
- G7-H1: Covered by priority labels, action ranking, scorecards, and score badges.
- G7-H2: Covered by `Assessment Notes` appearing after decision sections.
- G7-H3: Covered by report page reorganization and expandable details.
- G8-C1: Rechecked by actual report output and `report-page-structure.test.ts`.
- G8-C2: Rechecked by actual output showing `Fix These First` before `How this score was calculated`.
- G8-C3: Rechecked by small business owner self-QA.
- G8-C4: Rechecked by consultant-presenter self-QA.
- G8-H1: Rechecked by actual output containing `Highest priority`, `Lead readiness`, and scorecards.
- G8-H2: Rechecked by actual output containing `Review The Details` and expandable detail sections.
- G8-H3: Covered by `apps/web/src/app/reports/report-page-structure.test.ts`.
- G9-C1: Covered by this status file and `docs/operations/known-limitations.md`.
- G9-C2: Covered by the Phase 1 acceptance criteria in this status file, known limitations, release gates, deployment docs, and phase planning docs.
- G9-C3: Covered by the current readiness statement and release gates explicitly blocking production-ready classification.
- G9-H1: Covered by `docs/operations/release-gates.md`.
- G9-H2: Covered by `docs/product/phases.md` and `docs/engineering/deployment.md`.
- G10-C1: Covered by `apps/worker/src/assessment.test.ts`; zero-page crawl now rejects with `InsufficientEvidenceError`.
- G10-C2: Covered by web job status handling with `insufficient_evidence` and local API self-QA.
- G10-C3: Covered by `apps/worker/src/assessment.test.ts`; pages with no meaningful readable text do not score.
- G10-C4: Covered by partial evidence quality fields in report output and worker tests.
- G10-C5: Covered by unrestricted All Square Homes worker trace showing 19 pages crawled and actual evidence extracted.
- G10-H1: Covered by category confidence propagation from report evidence quality.
- G10-H2: Covered by redacted insufficient-evidence error handling and status panel messaging.
- G10-H3: Covered by `docs/operations/release-gates.md`.
- G11-C1: Rechecked by `apps/worker/src/assessment.test.ts`.
- G11-C2: Rechecked by local API/UI self-QA using `https://evidence-sufficiency-test.invalid/`; status was `insufficient_evidence` and no report was returned.
- G11-C3: Rechecked by unrestricted All Square Homes worker trace; 19 pages crawled, evidence quality `successful`, confidence `high`.
- G11-C4: Rechecked by partial-evidence worker test and report UI evidence quality display.
- G11-H1: Rechecked by insufficient-evidence redaction assertion in `apps/worker/src/assessment.test.ts`.
- G11-H2: Covered by this MDE status update and release gates.
- G12-C1: Covered by `apps/worker/src/assessment.test.ts` apex-to-www redirect regression test.
- G12-C2: Covered by the shared canonical hostname comparison used for both apex and `www` variants.
- G12-C3: Covered by the existing unrelated-domain redirect regression test.
- G12-H1: Covered by live unrestricted worker self-QA against `https://allsquarehomes.com/`; it crawled 17 pages with evidence quality `successful`.
- G13-C1: Rechecked by `apps/worker/src/assessment.test.ts`.
- G13-C2: Rechecked by `apps/worker/src/assessment.test.ts`.
- G13-C3: Rechecked by final local gate after code freeze.
- G13-H1: Rechecked from the recorded live All Square Homes apex trace.
- G14-C1: Covered by report UI scorecards rendering passed and missing check lists.
- G14-C2: Covered by factor-level `businessExplanation` fields and worker tests.
- G14-C3: Covered by factor-level `existingContentNote` fields and worker tests.
- G14-C4: Covered by detailed findings rendering check, evidence, explanation, existing-content note, and next action.
- G14-H1: Covered by LocalBusiness schema factor test.
- G14-H2: Covered by Google Business connection factor test.
- G14-H3: Covered by performance factor explanation and PageSpeed skipped behavior.
- G15-C1: Covered by `apps/worker/src/assessment.test.ts` slow-but-successful PageSpeed timeout test.
- G15-C2: Covered by unavailable Performance score behavior and report/top-problem filtering tests.
- G15-C3: Covered by measured PageSpeed score test and direct All Square Homes worker self-QA showing Performance 49/100 from PageSpeed 49/100.
- G15-C4: Covered by worker report test requiring one-to-five honest top problems and no healthy-category padding.
- G15-C5: Covered by `docs/operations/mde-history/` phase summary, mission evolution log, and generation records.
- G15-H1: Covered by this MDE status report distinguishing local PageSpeed configuration from staging/production secrets.
- G15-H2: Covered by business-impact wording regression test and direct All Square Homes impact-copy inspection.
- G15-H3: Covered by `docs/engineering/scoring-model.md`.
- G15-H4: Covered by `docs/operations/mde-history/phase-1/generations.md`.
- G16-C1: Covered by local app self-QA; `POST /api/scans` returned `pending`, `statusUrl`, and `reportUrl` immediately.
- G16-C2: Covered by local app self-QA; status progressed from `running` to `completed`, and the report appeared only in the completed payload.
- G16-C3: Covered by local app API and report-page self-QA; PageSpeed 49/100 produced Performance 49/100 and matching formula.
- G16-C4: Covered by actual report page HTML inspection showing Executive Summary, Biggest Opportunity, Fix These First, Score Summary, Evidence Traceability, and Detailed Findings.
- G16-C5: Covered by this status report and `docs/operations/mde-history/phase-1/generations.md`.
- G16-H1: Covered by second clean gate: format, lint, typecheck, 25 unit tests, 6 integration tests, and build passed.
- G16-H2: Covered by All Square Homes app self-QA showing 17 pages crawled and evidence quality `successful`.
- G16-H3: Covered by Founder Status Report blockers and readiness assessment.
- G16-H4: Covered by the known risks and build warning sections.
- G17-C1: Covered by `docs/validation/reference-tools.md`.
- G17-C2: Covered by `docs/validation/reference-tools.md`, `docs/product/why.md`, and `docs/engineering/testing-strategy.md`.
- G17-C3: Covered by `docs/validation/validation-matrix.md`.
- G17-C4: Covered by `docs/validation/candidate-sites.md`.
- G17-C5: Covered by `docs/validation/templates/site-validation-template.md`.
- G17-C6: Covered by `docs/operations/bdd-session-playbook.md`, this status report, and MDE history updates.
- G17-H1: Covered by the Founder Status Report missing inputs, required access, and external dependencies sections.
- G17-H2: Covered by `docs/validation/validation-matrix.md`.
- G17-H3: Covered by `docs/validation/validation-matrix.md` and `docs/validation/templates/site-validation-template.md`.
- G17-H4: Covered by production dependency separation in `docs/validation/reference-tools.md`.
- G17-H5: Covered by the Phase Readiness Assessment in this status report.
- G18-C1: Rechecked by artifact grep across `docs/validation/reference-tools.md`.
- G18-C2: Rechecked by artifact grep across validation, product, and testing docs.
- G18-C3: Rechecked by `docs/validation/validation-matrix.md`.
- G18-C4: Rechecked by file-existence checks for candidate sites and site-validation template.
- G18-C5: Rechecked by `docs/operations/mde-status.md`, `docs/operations/bdd-session-playbook.md`, and MDE history.
- G18-C6: Covered by second clean validation-gate artifact checks and full local gate.
- G18-H1: Covered by format, lint, typecheck, 25 unit tests, 6 integration tests, and build passing.
- G18-H2: Covered by the Founder Status Report missing inputs and external dependencies sections.
- G18-H3: Covered by validation matrix rows for Score Explainability and Report Quality.
- G18-H4: Covered by the Founder Status Report blockers and readiness assessment.
- G18-H5: Covered by the known risks and build warning sections.
- G19-C1: Covered by `docs/validation/runs/2026-06-06-generation-19-recurring-sites.md`.
- G19-C2: Covered by `apps/worker/src/assessment.test.ts` and the post-fix Jimmy John's validation outcome.
- G19-C3: Covered by `InsufficientEvidenceError` handling and validation run outcomes for Jimmy John's and Keller Williams.
- G19-C4: Covered by the Generation 19 validation run record.
- G19-C5: Covered by Orkin, Ace Hardware, and Anytime Fitness post-fix validation outcomes with unavailable PageSpeed.
- G19-C6: Covered by the new thin-readable-text regression test.
- G19-H1: Covered by the Ace Hardware runtime observation in the validation run record.
- G19-H2: Covered by the missed-findings and remaining-gaps sections in the validation run record.
- G19-H3: Covered by format, lint, typecheck, 26 unit tests, 6 integration tests, and build passing.
- G19-H4: Covered by this status report, `docs/operations/mdd-progress.md`, and MDE history.
- G19-H5: Covered by the Phase Readiness Assessment in this status report.
- G20-C1: Rechecked by `apps/worker/src/assessment.test.ts`.
- G20-C2: Rechecked by `docs/validation/runs/2026-06-06-generation-19-recurring-sites.md`.
- G20-C3: Rechecked by validation run record artifact checks.
- G20-C4: Rechecked by PageSpeed unavailable handling tests and validation run record.
- G20-C5: Covered by second clean artifact checks and full local gate.
- G20-C6: Covered by this status report and MDE history.
- G20-H1: Covered by format, lint, typecheck, 26 unit tests, 6 integration tests, and build passing.
- G20-H2: Covered by the validation run record and known risks.
- G20-H3: Covered by the Founder Status Report blockers and readiness assessment.
- G20-H4: Covered by the known risks and build warning sections.
- G20-H5: Covered by validation reference docs and the Founder Status Report.
- G21-C1: Covered by shared URL validation tests and local API self-QA returning `202 Accepted` for `medinaclean.com`.
- G21-C2: Covered by shared URL validation tests and local API self-QA returning `202 Accepted` for `www.medinaclean.com`.
- G21-C3: Covered by shared URL validation tests and local API self-QA returning `202 Accepted` for `https://medinaclean.com`.
- G21-C4: Covered by shared URL validation tests and local API self-QA returning `400 Bad Request` for `javascript:alert(1)`.
- G21-C5: Covered by shared URL validation tests and local API self-QA returning `400 Bad Request` for `localhost:3000`.
- G21-C6: Covered by changing the form input from strict `type="url"` to `type="text"` with `inputMode="url"`.
- G21-H1: Covered by updated API validation error copy.
- G21-H2: Covered by `docs/validation/runs/2026-06-07-generation-21-url-input-medinaclean.md`.
- G21-H3: Covered by format, lint, typecheck, 26 unit tests, 6 integration tests, and build passing.
- G21-H4: Covered by local API self-QA status-code checks.
- G21-H5: Covered by the Phase Readiness Assessment in this status report.
- G22-C1: Rechecked by shared URL validation tests and artifact grep checks.
- G22-C2: Rechecked by shared URL validation tests and artifact grep checks.
- G22-C3: Rechecked by shared URL validation tests and artifact grep checks.
- G22-C4: Rechecked by shared URL validation tests and artifact grep checks.
- G22-C5: Rechecked by web form implementation using text input with URL input mode.
- G22-C6: Covered by the second clean URL-normalization gate.
- G22-H1: Rechecked by API error-copy artifact checks.
- G22-H2: Rechecked by `docs/validation/runs/2026-06-07-generation-21-url-input-medinaclean.md`.
- G22-H3: Covered by format, lint, typecheck, 26 unit tests, 6 integration tests, and build passing.
- G22-H4: Covered by the Founder Status Report blockers and readiness assessment.
- G22-H5: Covered by the Medina Clean validation run record.
- G23-C1: Covered by the Biggest Opportunity card rendering `What We Found` before `What Still Needs Attention` and the recommendation.
- G23-C2: Covered by Detailed Findings sections separating `What We Found`, `What Is Missing`, `Machine-Readable Or Verifiable Signals`, and `Recommendation`.
- G23-C3: Covered by worker extraction treating `tel:` links as phone evidence and a regression test using `tel:770-555-1212`.
- G23-C4: Covered by Local Visibility found evidence including location/service-area URL examples in the worker regression test.
- G23-C5: Covered by self-QA requiring advice to acknowledge found evidence before recommendations.
- G23-H1: Covered by `apps/web/src/app/reports/report-page-structure.test.ts`.
- G23-H2: Covered by `apps/worker/src/assessment.test.ts`.
- G23-H3: Covered by this status report, `docs/product/why.md`, MDE history, and progress records.
- G23-H4: Covered by the Phase Readiness Assessment resetting local readiness until Generation 24.
- G24-C1: Rechecked by report structure tests and artifact checks for the Biggest Opportunity `What We Found` flow.
- G24-C2: Rechecked by report structure tests and artifact checks for Detailed Findings separation.
- G24-C3: Rechecked by worker tests and artifact checks for `tel:` evidence handling.
- G24-C4: Rechecked by worker tests and the fresh Medina Clean self-QA record.
- G24-C5: Covered by the second clean Trust Before Advice gate.
- G24-H1: Covered by format, lint, typecheck, 28 unit tests, 6 integration tests, and build passing.
- G24-H2: Rechecked by artifact checks across mission, status, history, and progress docs.
- G24-H3: Covered by the Founder Status Report blockers and readiness assessment.
- G24-H4: Covered by the known risks and build warning sections.
- G25-C1: Covered by `apps/worker/src/assessment.test.ts` with named review cards, star labels, and narrative recommendation language.
- G25-C2: Covered by the same regression test requiring both Testimonials and Reviews or ratings to pass.
- G25-C3: Covered by fresh Medina Clean local app self-QA showing both Trust Signals factors found.
- G25-C4: Covered by readiness reset under the two-generation gate.
- G25-H1: Covered by 29 passing unit tests.
- G25-H2: Covered by `docs/validation/runs/2026-06-07-medina-clean-testimonial-detection.md`.
- G25-H3: Covered by `docs/validation/validation-matrix.md`.
- G25-H4: Covered by format, lint, typecheck, 29 unit tests, 6 integration tests, and build passing.
- G26-C1: Rechecked by testimonial detection regression tests and artifact checks.
- G26-C2: Rechecked by regression tests requiring separate Reviews or ratings detection.
- G26-C3: Rechecked by validation run and validation matrix artifact checks.
- G26-C4: Covered by the second clean testimonial detection gate.
- G26-H1: Covered by format, lint, typecheck, 29 unit tests, 6 integration tests, and build passing.
- G26-H2: Covered by validation matrix wording that keeps Trust Signals at medium coverage.
- G26-H3: Covered by the Founder Status Report blockers and readiness assessment.
- G26-H4: Covered by the known risks and build warning sections.
- G27-C1: Covered by `evidenceDetails` on failed score factors and report rendering of `Evidence reviewed`.
- G27-C2: Covered by broken-image proof detail regression with source page, image URL, response code, and alt text.
- G27-C3: Covered by structured broken-asset evidence for links and passive asset details.
- G27-C4: Covered by missing phone evidence details showing pages checked, phone-like text, and `tel:` links.
- G27-C5: Covered by missing service-area evidence details showing pages checked and candidate location links.
- G27-C6: Covered by testimonial-negative regression explaining review/rating evidence versus testimonial-like customer stories.
- G27-C7: Covered by rendered report HTML inspection and `report-page-structure.test.ts`.
- G27-H1: Covered by escaped image URL decoding regression.
- G27-H2: Covered by duplicate internal asset URL bounding regression.
- G27-H3: Covered by passive asset candidate cap and 3000ms per-asset timeout.
- G27-H4: Covered by legacy scan-store normalization of `evidenceDetails`.
- G27-H5: Covered by format, lint, typecheck, 35 unit tests, 6 integration tests, and build passing.
- G27-H6: Covered by MDE history, mission evolution, progress, and this status report.
- G28-C1: Rechecked by report structure tests and worker evidence-detail regressions.
- G28-C2: Rechecked by escaped URL and duplicate asset-check regressions.
- G28-C3: Rechecked by final Medina Clean self-QA record from Generation 27.
- G28-C4: Covered by the second clean no-negative-finding evidence gate.
- G28-C5: Covered by this MDE status report and generation history.
- G28-C6: Covered by no implementation changes between Generation 27 and Generation 28.
- G28-H1: Covered by format, lint, typecheck, 35 unit tests, 6 integration tests, and build passing.
- G28-H2: Covered by known Turbopack warning sections.
- G28-H3: Covered by Founder Status Report blockers and readiness assessment.
- G28-H4: Covered by rendered report output inspection from Generation 27 and unchanged code in Generation 28.
- G28-H5: Covered by staging/production blockers remaining visible.
- G5-C1: Covered by local self-QA: `POST /api/scans` returned `202`, `pending`, and did not include a completed report.
- G5-C2: Covered by `apps/web/src/lib/scan-store.test.ts`.
- G5-C3: Covered by `apps/web/src/lib/scan-store.test.ts` and local status API self-QA.
- G5-C4: Covered by `apps/web/src/lib/scan-store.test.ts`.
- G5-C5: Covered by `apps/web/src/app/reports/[id]/page.tsx` status gating and local report-page self-QA.
- G5-C6: Covered by `apps/worker/src/assessment.test.ts`.
- G5-C7: Covered by score explanation fields in `CategoryAssessment` and `docs/engineering/scoring-model.md`.
- G5-H1: Covered by `apps/web/src/app/admin/page.tsx`.
- G5-H2: Covered by `apps/web/src/app/reports/[id]/page.tsx` and local report-page self-QA.
- G5-H3: Covered by `docs/engineering/scoring-model.md`.
- G6-C1: Rechecked by self-QA after code freeze: submit returned `202` and `pending` in `0.042045s`.
- G6-C2: Rechecked by status API output showing completed job state.
- G6-C3: Rechecked by report route behavior and status component implementation.
- G6-C4: Rechecked by API output containing `factors`, `scoreExplanation`, and `weightedContribution`.
- G6-C5: Covered by `normalizeStoredItem` and `normalizeReport` in `apps/web/src/lib/scan-store.ts`.
- G6-C6: Rechecked by actual API and report UI output inspection.
- G6-H1: Rechecked by `/admin` output.
- G6-H2: Rechecked by `docs/engineering/scoring-model.md`.
- G6-H3: Covered by stable indexed keys in `apps/web/src/app/reports/[id]/page.tsx`.
- C1: Covered by `apps/worker/src/assessment.test.ts`.
- C2: Covered by `apps/worker/src/assessment.test.ts`.
- C3: Covered by shared `crawlerPolicy.maxConcurrency` and `packages/shared/tests/foundation.test.ts`.
- C4: Covered by `apps/worker/src/assessment.test.ts` and `tests/integration/phase1-pipeline.test.ts`.
- C5: Covered by `apps/worker/src/assessment.test.ts`.
- C6: Covered by `apps/worker/src/assessment.test.ts` and `packages/shared/tests/security.test.ts`.
- C7: Covered by `apps/worker/src/assessment.test.ts` and `tests/integration/phase1-pipeline.test.ts`.
- H1: Covered by `apps/worker/src/assessment.test.ts`.
- H2: Covered by worker metadata implementation and report UI in `apps/web/src/app/reports/[id]/page.tsx`.
- H3: Covered by `apps/web/src/lib/scan-store.test.ts` and local self-QA against `/admin`.

## Scenarios Failing

- None for current Critical or High local checks.
- L1 remains deferred because centralized observability is outside the current Phase 1 local gate.

## Two-Generation Readiness Result

- Generation 7 result: report organization and presentation Critical/High scenarios passed after implementation.
- Generation 8 result: second fresh report presentation review found no unresolved Critical or High failures.
- Implementation code changes between clean Generation 7 and clean Generation 8: none.
- Generation 9 result: Turbopack warning and filesystem-store risk classification Critical/High documentation scenarios passed.
- Implementation code changes in Generation 9: none. Documentation and gates only.
- Generation 10 result: Critical/High evidence sufficiency scenarios pass locally after implementation and All Square Homes trace.
- Code freeze point: after evidence sufficiency gate, insufficient-evidence status, partial confidence display, redacted insufficient-evidence errors, and tests passed.
- Generation 11 result: second fresh evidence sufficiency review found no unresolved Critical or High failures.
- Implementation code changes between clean Generation 10 and clean Generation 11: none.
- Generation 12 result: canonical redirect boundary Critical/High scenarios pass locally after implementation.
- Code freeze point: after canonical apex/`www` hostname comparison and redirect regression test passed.
- Generation 13 result: second fresh canonical redirect review found no unresolved Critical or High failures.
- Implementation code changes between clean Generation 12 and clean Generation 13: none.
- Generation 14 result: evidence traceability and business explainability Critical/High scenarios pass locally after implementation.
- Generation 15 result: PageSpeed validation, measured Performance scoring, and MDE history Critical/High scenarios pass locally after implementation and direct All Square Homes self-QA.
- Generation 16 result: second fresh PageSpeed/report/MDE history verification passed with no unresolved Critical or High failures.
- Implementation code changes between clean Generation 15 and clean Generation 16: none.
- Two-generation readiness achieved locally after Generation 16.
- Generation 17 result: competitive validation strategy Critical/High scenarios pass after documentation and MDE process updates.
- Generation 18 result: second clean competitive validation verification passed with no unresolved Critical or High failures.
- Implementation changes between clean Generation 17 and clean Generation 18: none.
- Two-generation readiness achieved locally after Generation 18.
- Generation 19 result: recurring competitive validation found a thin-evidence scored-report risk; the issue was fixed and Critical/High checks pass after implementation.
- Generation 20 result: second clean post-validation verification passed with no unresolved Critical or High failures.
- Implementation changes between clean Generation 19 and clean Generation 20: none.
- Two-generation readiness achieved locally after Generation 20.
- Generation 21 result: URL input normalization Critical/High scenarios pass after implementation and local API self-QA.
- Generation 22 result: second clean URL-normalization verification passed with no unresolved Critical or High failures.
- Implementation changes between clean Generation 21 and clean Generation 22: none.
- Two-generation readiness achieved locally after Generation 22.
- Generation 23 result: Trust Before Advice Critical/High scenarios passed after implementation, self-QA, fresh Medina Clean report inspection, and full local gate execution.
- Implementation changes after Generation 22: report UI, signal extraction, tests, and MDE documentation changed.
- Generation 24 result: second clean Trust Before Advice verification passed with no unresolved Critical or High failures.
- Implementation changes between clean Generation 23 and clean Generation 24: none.
- Two-generation readiness achieved locally after Generation 24.
- Generation 25 result: testimonial-like customer proof detection Critical/High scenarios passed after implementation, fresh Medina Clean self-QA, and full local gate execution.
- Implementation changes after Generation 24: worker testimonial/review detection and worker regression tests changed.
- Generation 26 result: second clean testimonial detection verification passed with no unresolved Critical or High failures.
- Implementation changes between clean Generation 25 and clean Generation 26: none.
- Two-generation readiness achieved locally after Generation 26.
- Generation 27 result: no-negative-finding-without-evidence Critical/High scenarios passed after implementation, Medina Clean self-QA, escaped URL fix, duplicate asset-check bounding, and full local gate execution.
- Implementation changes after Generation 26: shared schema, worker extraction/scoring, report rendering, scan-store normalization, tests, and MDE documentation changed.
- Generation 28 result: second clean no-negative-finding-without-evidence verification passed with no unresolved Critical or High failures.
- Implementation changes between clean Generation 27 and clean Generation 28: none.
- Two-generation readiness achieved locally after Generation 28.
- Generation 5 result: Critical and High scenarios passed after implementation fixes.
- Code freeze point: after async submission, score explainability, legacy report normalization, and duplicate-key fixes.
- Generation 6 result: fresh BDD review found no unresolved Critical or High failures.
- Implementation code changes between clean Generation 5 and clean Generation 6: none.
- Phase readiness under the two-generation rule: local gate was restored after Generation 27 and Generation 28 clean passes with no implementation changes between them.

## Tests Reused From Previous Generation

- `packages/shared/tests/foundation.test.ts`
- `packages/shared/tests/security.test.ts`
- `apps/worker/src/assessment.test.ts`
- `tests/integration/foundation-gate.test.ts`
- `tests/integration/phase1-pipeline.test.ts`

## Tests Newly Added In Current Generation

- `apps/web/src/app/reports/report-page-structure.test.ts`
- `apps/web/src/lib/scan-store.test.ts`
- New cases in `apps/worker/src/assessment.test.ts` for request timeout, response truncation, redirect boundary, redacted assessment events, and PageSpeed timeout.
- Updated scan-store behavior to persist local reports to a file-backed store so API-created reports are visible to report/admin pages across Next server contexts.
- Updated scan-store tests for asynchronous pending, running, completed, and failed job transitions.
- Updated worker tests so every category score must include factor-level score explanation fields.
- New cases in `apps/worker/src/assessment.test.ts` for zero-page insufficient evidence and partial low-confidence reports.
- New case in `apps/worker/src/assessment.test.ts` for apex-to-www canonical redirect handling.
- New case in `apps/worker/src/assessment.test.ts` for business-language factor explanations and existing-content distinctions.
- Updated `apps/web/src/app/reports/report-page-structure.test.ts` for traceability UI.
- Updated integration fixture to include enough readable website evidence for a successful report.
- Generation 23: updated `apps/web/src/app/reports/report-page-structure.test.ts` to require found evidence before missing items and recommendations.
- Generation 23: added `apps/worker/src/assessment.test.ts` coverage proving `tel:` phone links and location-page examples are acknowledged as found evidence.

## Tests Removed Or Deferred

- Removed: none.
- Deferred: centralized observability provider, dashboards, and alerts.

## Implementation Changes Made

- Reorganized report UI around the required hierarchy: Executive Summary, Biggest Opportunity, Top Recommended Actions, Score Summary, Supporting Evidence, and Detailed Findings.
- Moved detailed score formulas and diagnostics behind expandable detail sections.
- Added scorecards, priority indicators, action ranking, impact-oriented cards, and restrained score badges.
- Moved technical assessment metadata after decision-oriented sections.
- Updated product and testing docs to define the report as a decision-oriented customer deliverable.
- Documented the Turbopack tracing warning as a known Phase 1 implementation risk caused by the local filesystem-backed scan store.
- Added explicit conditions for accepting that warning in Phase 1 only.
- Added release and phase-planning language requiring a proper persistent store before production readiness.
- Added evidence sufficiency gating before scoring.
- Added `insufficient_evidence` assessment status for scans where no trustworthy report can be produced.
- Added report-level evidence quality with successful/partial status, confidence, readable page counts, text volume, summary, and limitations.
- Added partial-report confidence display in the customer report.
- Updated status UI so insufficient-evidence assessments explain that no trustworthy report was produced.
- Updated product, scoring, testing, and release-gate docs to require evidence sufficiency before report generation.
- Allowed crawler redirects between apex and `www` variants of the submitted hostname while still blocking unrelated hostnames.
- Added factor-level check names, business explanations, existing-content comparison notes, and next actions.
- Updated score summary cards to show passed and missing checks near the score.
- Added `What We Checked` evidence traceability section before detailed diagnostics.
- Updated detailed findings to connect score factors to evidence, business impact, existing-content distinction, and next action.
- Updated docs to require evidence traceability and business explainability.
- Changed URL submission from synchronous crawl execution to asynchronous job creation.
- Added pending, running, completed, and failed assessment status.
- Added status API responses for assessment jobs.
- Added report-page status gating so report content appears only after completion.
- Added polling status UI for pending/running assessments.
- Added score explanation fields to every category: weight, factors, formula, passed factor count, total factor count, weighted contribution, confidence, found evidence, missing evidence, business impact, and recommended fix.
- Added scoring model documentation in `docs/engineering/scoring-model.md`.
- Added resource policy fields to shared crawler policy: request timeout, max response bytes, max concurrency, and max scan history.
- Expanded crawl metadata with duration, resource limits, crawl decisions, skipped URLs, adapter failures, and PageSpeed status.
- Added worker timeout wrapper for crawl fetches and PageSpeed adapter calls.
- Added response byte accounting and safe HTML truncation.
- Added explicit sequential crawl policy with `maxConcurrency: 1`.
- Added redacted assessment event emission.
- Added redirect boundary protection.
- Added bounded file-backed local scan history.
- Added legacy report normalization so older locally stored reports gain score explanations.
- Surfaced operational scan details on report pages.
- Updated operations and engineering docs to reflect refined release gates.

## End-To-End Self-QA

### Scenarios Executed

- QA1: Open the local homepage and confirm it serves the current Phase 1 app.
- QA2: Submit a realistic public URL through `POST /api/scans`.
- QA3: Inspect the API response for report content and operational metadata.
- QA4: Open the generated report URL and confirm the report renders.
- QA5: Inspect the report page for duration, resource limits, skipped URLs, and scan details.
- QA6: Open `/admin` and confirm the generated scan appears in scan history.
- QA7: Confirm submit returns `202` plus `pending` without a completed report.
- QA8: Poll `/api/scans/:id` and confirm completed status later includes report and score explanations.
- QA9: Confirm report UI shows `How this score was calculated`, weighted contribution, and confidence.
- QA10: Review the completed report as a small business owner for one-minute comprehension.
- QA11: Review the completed report as a consultant presenting findings to a customer.
- QA12: Confirm actual report output follows the required hierarchy before detailed diagnostics.

### Actual Results Observed

- QA1: Homepage responded and included `Local Website Growth Assessment`, `Phase 1: Complete Vertical Slice`, and `View scan history`.
- QA2: `POST /api/scans` with `https://example.com` returned `scanId: example-com-1780694305786`.
- QA3: API response included `durationMs`, `requestTimeoutMs`, `maxResponseBytes`, `maxConcurrency`, `decisions`, `adapterFailures`, category evidence, skipped PageSpeed explanation, and disclaimer.
- QA4: The generated report URL loaded after the file-backed store fix.
- QA5: Report output included `Scan Details`, `Duration`, `Resource limits`, `10000ms timeout`, `750000 bytes`, `concurrency 1`, and `Skipped URLs`.
- QA6: `/admin` displayed `example.com` and a `View report` link after the file-backed store fix.
- QA7: `POST /api/scans` with `https://example.com` returned `202`, `pending`, `statusUrl`, and `reportUrl` in `0.042045s`.
- QA8: `/api/scans/example-com-1780695351305` returned `completed` with `report`, `factors`, `scoreExplanation`, and `weightedContribution`.
- QA9: `/reports/example-com-1780695351305` displayed `Assessment report`, `How this score was calculated`, `Weighted contribution`, `Confidence`, `Scan Details`, and `Resource limits`.
- QA10: Small business owner review: the top of the report now makes the grade, biggest opportunity, and first recommended actions visible before score formulas or crawl metadata.
- QA11: Consultant review: the page supports a presentation flow from summary to opportunity to actions to evidence, with details expandable for follow-up questions.
- QA12: Actual output for `/reports/example-com-1780696155007` included `Executive Summary`, `Lead readiness`, `Highest priority`, `Biggest Opportunity`, `Fix These First`, `Where The Website Stands`, `Why These Actions Matter`, `Review The Details`, `How this score was calculated`, and `Assessment Notes`.
- QA13: Documentation-risk validation ran `npm run format`, `npm run lint`, `npm run typecheck`, `npm run test`, `npm run test:integration`, and `npm run build`.
- QA14: `npm run build` passed and reproduced the Turbopack tracing warning import trace through `apps/web/src/lib/scan-store.ts`, confirming the warning is tied to the Phase 1 filesystem-backed scan store.
- QA15: Reproduced the All Square Homes failure in restricted local runtime: `pagesCrawled: 0`, homepage fetch failed, scoring still produced a normal F report before the fix.
- QA16: Verified the live site is publicly reachable with the assessment user agent under unrestricted network access: homepage returned `200 OK` and HTML.
- QA17: Ran unrestricted worker trace during investigation; All Square Homes crawled 19 pages with actual evidence and no adapter failures.
- QA18: Added zero-evidence test coverage so failed crawl evidence is no longer scored as a trustworthy report.
- QA19: Local API self-QA submitted `https://evidence-sufficiency-test.invalid/`; response returned `202 pending`, then status became `insufficient_evidence`.
- QA20: Local status API for the insufficient-evidence scan returned no `report` payload.
- QA21: Local report route for the insufficient-evidence scan showed an assessment status page and the message that no trustworthy report was produced.
- QA22: Final gate ran `npm run format`, `npm run lint`, `npm run typecheck`, `npm run test`, `npm run test:integration`, and `npm run build`.
- QA23: Final `npm run build` passed with the known Turbopack tracing warning from `apps/web/src/lib/scan-store.ts`.
- QA24: User self-test exposed `redirected outside submitted domain` for a canonical redirect.
- QA25: Live unrestricted worker self-QA against `https://allsquarehomes.com/` crawled 17 pages, followed the redirect to `https://www.allsquarehomes.com/`, returned evidence quality `successful`, confidence `high`, and no adapter failures.
- QA26: Second clean canonical redirect gate ran `npm run format`, `npm run lint`, `npm run typecheck`, `npm run test`, `npm run test:integration`, and `npm run build`.
- QA27: Second clean gate passed with 22 unit tests and 6 integration tests; build still shows the known Turbopack tracing warning.
- QA28: Report source self-review confirms score summaries render passed and missing checks near each score.
- QA29: Worker output self-review confirms LocalBusiness schema and Google Business connection missing signals explain business impact and existing-content distinctions.
- QA30: Direct PageSpeed API validation confirmed the local key works, but the API can take longer than the previous crawl request timeout.
- QA31: Direct All Square Homes worker self-QA after PageSpeed timeout changes crawled 17 pages and initially exposed that PageSpeed 47/100 was being scored as Performance 100/100.
- QA32: Direct All Square Homes worker self-QA after the measured-performance fix crawled 17 pages, PageSpeed returned 49/100, Performance scored 49/100, and the score formula matched the measured evidence.
- QA33: Impact-copy self-review confirmed top problems no longer include healthy Lead Conversion padding and no longer contain repeated `signals signals` wording.

### Issues Found

- Critical: The previous module-level in-memory scan store was not reliable across Next dev/server contexts. A scan could be created by the API while `/admin` showed no scans and a generated report URL later returned 404.
- Critical: The previous submit request blocked on long-running crawl execution and returned a completed report directly.
- Critical: Legacy locally stored reports lacked new score explanation fields and could crash the report UI after score explainability was added.
- High: Duplicate skipped URLs caused duplicate React key warnings in report output.
- Critical: The previous report organization put category scores and diagnostics before the most decision-useful recommendation path.
- Critical: A zero-page crawl could still produce a completed customer-facing scored report with medium confidence.
- Critical: Missing evidence was treated as website weakness even when the runtime had collected no meaningful website evidence.
- Critical: A safe redirect between apex and `www` variants of the same submitted website was treated as outside-domain evidence loss.
- Critical: Score summaries did not adequately connect summary, checks, evidence, business impact, existing-content distinction, and next action.
- High: PageSpeed could succeed with a real mobile score but Performance was scored as 100/100 because the previous factor only checked whether measurement existed.
- High: Top business problems could be padded with healthy categories when fewer than five weak categories existed.
- High: Customer-facing business-impact copy could contain awkward repeated wording such as `trust signals signals`.

### Fixes Made

- Replaced module-only scan persistence with a bounded file-backed local store under `.next/assessment-scans.json`.
- Kept the existing max scan history policy.
- Verified report and admin pages can read scans created through the API.
- Kept `apps/web/src/lib/scan-store.test.ts` covering bounded scan history.
- Added asynchronous assessment job flow and status polling.
- Added score explanation model and UI.
- Added legacy report normalization.
- Added stable indexed keys for repeated skipped URLs and score factors.
- Rebuilt the report page around decision-first hierarchy and expandable diagnostics.
- Added a report structure regression test.
- Added evidence sufficiency evaluation before scoring.
- Added insufficient-evidence status instead of completing zero-evidence scans.
- Added report confidence and limitations for partial assessments.
- Added canonical hostname comparison for apex/`www` submitted-domain variants.
- Added traceable factor explanations and rendered them in score summaries, supporting evidence, traceability, and detailed findings.
- Added a PageSpeed-specific timeout separate from crawl request timeout.
- Changed measured Performance scoring to use the PageSpeed mobile score.
- Changed unavailable Performance behavior to `Not measured`, excluded from overall score and top problems.
- Changed top business problem selection to avoid healthy-category padding.
- Cleaned up category business-impact wording and added regression tests.
- Added append-only MDE history records under `docs/operations/mde-history/`.
- Added competitive validation reference docs, validation matrix, candidate sites, and site-validation template.
- Updated MDE telemetry expectations for validation runs, matched findings, missed findings, false positives, false negatives, report quality observations, and score explainability observations.

### Remaining Risks

- The local file-backed store is appropriate for Phase 1 local/staging validation but is not durable production storage.
- `next build` passes but emits a Turbopack tracing warning because the Phase 1 local scan store uses filesystem access. This is acceptable for Phase 1 only if the build passes, automated tests pass, runtime behavior works in local/staging, the warning remains documented in `docs/operations/mde-status.md` and `docs/operations/known-limitations.md`, and Phase 2 or production readiness replaces the filesystem-backed store with a proper persistent store.
- A passing build with this Turbopack warning must not be treated as fully production-ready.
- Visual review was performed through local HTML/output inspection rather than a captured browser screenshot.
- Benchmark examples and annotated screenshots are allowed by the mission but not implemented in Phase 1.
- Staging deployment has not been run.
- Production deployment remains blocked.
- Centralized observability export remains deferred.
- The All Square Homes failure was caused by restricted local DNS/network access producing zero crawl evidence; the site itself is publicly reachable and crawlable.
- Staging deployment validation has not been run.
- Production persistent storage is still required before production readiness.
- Candidate validation sites were founder-confirmed as not current clients or active prospects on 2026-06-06.
- Orkin replaced All Square Homes/Baird & Warner as candidate site 1 after founder feedback.
- Screaming Frog comparison remains manual and uses the free version for Phase 1.
- Recurring validation run history has not yet been populated for all candidate sites.

## Current Phase Readiness

Phase 1 staging readiness passed after Generation 32. Production deployment was attempted from the branch-aligned `main` path, but Generation 33 found a Critical production runtime validation failure: the production Worker had a PageSpeed secret configured, yet a live Medina Clean report still said PageSpeed was skipped because no API key was configured.

The Generation 33 fix captures the Cloudflare runtime environment when the assessment is queued and passes the PageSpeed key into the background assessment runner. Local automated validation now passes, but Phase 1 production readiness is not restored until the fix is committed, deployed from `main`, and post-fix production self-QA confirms PageSpeed is no longer reported as missing when the secret is configured.

The Turbopack tracing warning from the filesystem-backed scan store is classified as an acceptable Phase 1 implementation risk only under the documented conditions above. This classification does not make the build production-ready.

## Blockers

- Generation 33 deployment and post-fix production self-QA are still pending.
- Production PageSpeed runtime behavior must be revalidated after deploying the queued-runtime fix.
- Filesystem-backed local scan storage must be replaced before full production maturity, even though deployed Cloudflare environments now use D1.
- The mistaken personal repository `ferosh-northvalley/local-website-growth-assessment` still exists from the earlier setup attempt and should only be deleted with explicit founder approval.

## Goal Drift Review

1. What supports the mission?

   The current Phase 1 slice safely analyzes public website information, protects assessed sites with strict crawl limits, blocks zero-evidence scored reports, reports operational limits honestly, and generates business-friendly lead-generation recommendations only when there is enough evidence.

2. What is missing?

   Staging deployment, completed recurring validation runs, and centralized observability export are not implemented. Durable persistent storage is also deferred and is now an explicit production-readiness blocker.

3. What is over-engineered?

   Nothing material. The current reliability mechanisms are small, local, and tied directly to the refined mission.

4. What was deferred?

   Automated MDE telemetry generation, automated validation trend aggregation, Screaming Frog export parsing, screenshot QA, centralized observability dashboards, durable scan storage, more nuanced per-category evidence confidence, PDF export, shareable report URLs, consultation CTA, analytics connectors, benchmark library, staging deployment execution, and production deployment.

5. Are we still helping local business owners understand why their website may not generate leads?

   Yes. The product remains focused on explaining local lead-generation issues in plain English, with the added corrections that it withholds scored advice when evidence is insufficient, does not turn unavailable or measured external tooling behavior into misleading customer advice, and now has a documented validation strategy for improving correctness and report quality over time.
