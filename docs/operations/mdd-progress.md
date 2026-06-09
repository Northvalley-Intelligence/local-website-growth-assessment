# MDD Progress

## 2026-06-05 Phase 0 Session

Mission reviewed: Help local business owners understand why their website may not be generating leads through safe public website assessment and plain-English recommendations.

Phase goal reviewed: Create a professional repository foundation before product features.

### Fresh BDD Scenarios

- Critical: Given a new engineer opens the repo, when they read the root docs, then they can find the mission, current phase, and phase gate.
- Critical: Given CI runs, when it executes the workflow, then lint, typecheck, unit tests, integration tests, and build are all covered.
- Critical: Given the repo is in Phase 0, when tests run, then required docs and package boundaries are verified before product features.
- High: Given local development starts, when env docs are read, then staging and production environment strategy is clear without exposing secrets.
- High: Given shared code is imported by apps, when typecheck runs, then workspace package boundaries compile.
- Low: Given a founder wants deployment automation, when reading docs, then provider-specific steps are fully scripted.

### Goal Drift Review

1. What supports the mission?

   The repo now has a clear mission, current phase, safety/data-handling docs, package boundaries, shared scoring weights, crawler policy constants, and foundation tests. This supports the mission by preventing feature work from starting without explicit safety, testing, and release discipline.

2. What is missing?

   Phase 1 product behavior is not implemented yet: URL submission, safe crawl, extraction, scoring execution, report generation, scan history, and staging deployment readiness are still missing.

3. What is over-engineered?

   Nothing material for Phase 0. The web app is intentionally minimal and exists only to prove the Next.js foundation builds.

4. What was deferred?

   Provider-specific deployment automation, production deployment, crawl logic, PageSpeed integration, report UI, and admin scan history were deferred because they belong to later phase goals.

5. Are we still helping local business owners understand why their website may not generate leads?

   Yes. The foundation keeps the product focused on safe public assessment and business-friendly recommendations before implementing the Phase 1 vertical slice.

### Phase Gate Result

Phase 0 gate passed on 2026-06-05.

Verified commands:

- `npm run format`
- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run test:integration`
- `npm run build`
- `npm audit --audit-level=moderate` reported zero vulnerabilities after updating direct dependencies and overriding PostCSS to the fixed version.

Phase 1 may begin in a future session, but this session stops at the Phase 0 gate.

## 2026-06-05 Phase 1 Session

Mission reviewed: Help local business owners understand why their website may not be generating leads through safe public website assessment and plain-English recommendations.

Phase goal reviewed: Build the first usable version from URL input to safe public crawl to signal extraction to scoring to report page.

### Fresh BDD Scenarios

- Critical: Given a business owner submits a public website URL, when the assessment starts, then unsafe schemes, localhost, private IPs, and credentialed URLs are rejected before crawling.
- Critical: Given a submitted domain has robots.txt disallowing a path, when the crawler discovers that path, then it does not fetch it.
- Critical: Given a submitted site links to another domain, when crawling proceeds, then outside-domain URLs are not crawled.
- Critical: Given a site contains forms, when the crawler assesses the page, then no form is submitted and only public page GET requests are made.
- Critical: Given a site has many internal links, when crawling proceeds, then the crawler enforces max 25 pages and max depth 2.
- Critical: Given a crawl completes, when a report is generated, then every scoring category includes score, found evidence, missing evidence, business impact, and recommended fix.
- Critical: Given no PageSpeed API key is configured, when performance is scored, then PageSpeed is skipped with a plain-English explanation and no made-up data.
- Critical: Given logs include environment-like secret values, when logs are sanitized, then secrets are redacted.
- High: Given public pages include phone numbers, contact links, testimonials, reviews, photos, or schema, when extraction runs, then those contact and trust signals affect the report evidence.
- High: Given pages reference broken links or images, when passive reliability checks run, then broken items are reflected in Security & Reliability evidence.
- High: Given the report is shown to a business owner, when recommendations are generated, then they avoid jargon and explain likely business impact.
- Low: Given the assessment completes, when an operator wants long-term history, then scans are durably stored across deployments.

### Goal Drift Review

1. What supports the mission?

   The product now accepts a public website URL, performs a same-domain public crawl, extracts lead-generation signals, scores all eight required categories, and shows a plain-English report with evidence, business impact, recommended fixes, revenue leakage, neighbor referral score, and the required disclaimer.

2. What is missing?

   The scan history is in-memory only, staging has not been deployed, the crawler uses lightweight HTML extraction, and the mobile experience checks are basic passive signals rather than visual layout inspection.

3. What is over-engineered?

   Nothing material. The worker has adapter boundaries for fetch and PageSpeed because those are required for safe tests and future deployment, not speculative abstraction.

4. What was deferred?

   Durable storage, PDF export, shareable report URLs, consultation CTA, customer login, analytics connectors, benchmark library, and production deployment were deferred.

5. Are we still helping local business owners understand why their website may not generate leads?

   Yes. The vertical slice focuses on business-visible causes: local visibility, conversion paths, trust proof, message clarity, mobile contact access, AI-readable content, performance availability, and reliability basics.

### Phase Gate Result

Phase 1 Critical and High local implementation checks passed on 2026-06-05.

Verified commands:

- `npm run format`
- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run test:integration`
- `npm run build`
- `npm audit --audit-level=moderate`

Staging readiness is documented in `docs/engineering/deployment.md`, but staging deployment has not been run in this session. Production deployment remains blocked until staging succeeds and production is explicitly approved.

Phase 2 was not started.

## 2026-06-05 Phase 1 Mission Refinement Reassessment

Mission refinement reviewed from `docs/product/why.md`: The assessment must safely and reliably analyze public website information, protect assessed sites and system resources, make assessment behavior observable, validate against realistic website conditions, and produce plain-English recommendations with clear evidence and honest limits.

Phase goal reviewed: Build the first usable version from URL input to safe public crawl to signal extraction to scoring to report page.

### Regenerated BDD Scenarios

- Critical: Given a submitted site is slow or unresponsive, when the crawler requests a page, then the request times out within a configured limit and the report explains the skipped page without blocking the whole assessment.
- Critical: Given a page response is very large, when the crawler reads it, then response size is bounded and oversized content is skipped or truncated safely.
- Critical: Given many links are discovered quickly, when crawling proceeds, then concurrency and total requests are bounded so the assessed website is not overloaded.
- Critical: Given robots.txt, private/admin path rules, same-domain rules, max pages, and max depth apply, when any request is considered, then the decision is observable as crawled or skipped with a reason.
- Critical: Given PageSpeed, crawl fetches, or report generation fail partially, when a report is generated, then the report distinguishes measured evidence from skipped or unavailable evidence and does not invent certainty.
- Critical: Given logs or events are emitted, when they include URLs, errors, headers, or environment-like values, then secrets are redacted and unnecessary raw HTML is not logged.
- Critical: Given the test suite validates the crawler, when it runs, then it includes realistic mocked sites with robots exclusions, broken pages, forms, external links, non-HTML assets, and partial evidence.
- High: Given redirects occur within the same domain, when crawling proceeds, then redirects are handled without escaping the submitted-domain boundary or looping indefinitely.
- High: Given non-HTML assets are linked, when passive reliability checks run, then the crawler does not parse them as pages and records only needed status evidence.
- High: Given an operator reviews a scan, when they inspect scan metadata, then they can see duration, pages crawled, skipped URL reasons, PageSpeed status, and major adapter failures.
- High: Given repeated local scans occur, when the system is under load, then in-memory state or queues remain bounded for the Phase 1 deployment shape.
- Low: Given a staging deployment is live, when operational incidents occur, then structured events are exported to a centralized observability provider with dashboards and alerts.

### Readiness Reassessment

Current passing coverage still supports the original Phase 1 vertical slice:

- URL validation rejects unsafe schemes, localhost, private IPs, and credentialed URLs.
- Same-domain crawling is tested.
- robots.txt exclusion is tested.
- Forms are discovered but not submitted.
- Max pages and max depth are tested.
- Reports include required category evidence, business impact, and recommendations.
- PageSpeed missing-key behavior is tested and does not fabricate data.
- Secret redaction helper is tested.
- Realistic mocked integration coverage includes robots exclusions, broken links, forms, external links, and partial evidence.

New Critical/High gaps created by the refined mission:

- Critical gap: no configured request timeout is enforced around fetch adapters.
- Critical gap: no response-size limit is enforced before reading page text.
- Critical gap: crawl concurrency is effectively sequential, which is safe for load, but there is no explicit bounded-concurrency policy or test.
- Critical gap: skipped/crawled decisions are partially observable, but successful request duration, adapter failure types, and full decision metadata are not yet recorded.
- Critical gap: logs/events are not implemented, so redaction is tested only as a helper, not as part of an observability path.
- High gap: redirect behavior and redirect-loop protection are not explicitly modeled or tested.
- High gap: scan metadata does not yet include duration or adapter failure summaries.
- High gap: in-memory scan history has no explicit bound.

### Phase 1 Gate Reassessment

Under the refined mission, Phase 1 should be considered not fully ready. The existing local vertical slice works, but Critical and High reliability/observability/resource-protection scenarios are not all implemented or tested.

Phase 1 remains active. Phase 2 should not start until the new Critical and High gaps above are addressed or explicitly reclassified with written rationale.

## 2026-06-05 Phase 1 Reliability Iteration

Mission reviewed: The refined mission now requires safe public analysis, operational reliability, observability, resource protection, realistic validation, and honest plain-English recommendations.

Phase goal reviewed: Complete the first usable URL input to safe crawl to signal extraction to scoring to report page slice.

### Regenerated BDD Scenarios

- Critical: Given a submitted site is slow or unresponsive, when the crawler requests a page, then the request times out within a configured limit and the report explains the failed page without blocking the whole assessment.
- Critical: Given a page response is very large, when the crawler reads it, then response size is bounded and oversized content is truncated safely.
- Critical: Given many links are discovered quickly, when crawling proceeds, then Phase 1 uses an explicit bounded concurrency policy of one request at a time.
- Critical: Given robots.txt, private/admin path rules, same-domain rules, max pages, and max depth apply, when a request is considered, then the decision is observable as crawled, skipped, or failed with a reason.
- Critical: Given PageSpeed, crawl fetches, or report generation fail partially, when a report is generated, then the report distinguishes measured evidence from skipped or unavailable evidence and does not invent certainty.
- Critical: Given assessment events are emitted, when they include error messages or URL-like values, then secrets are redacted before they leave the worker.
- Critical: Given tests validate the crawler, when they run, then they include realistic mocked sites with robots exclusions, broken pages, forms, external links, non-HTML/passive checks, timeouts, oversized responses, redirects, and partial evidence.
- High: Given redirects cross to another domain, when crawling proceeds, then the redirected page is skipped and the submitted-domain boundary is preserved.
- High: Given an operator reviews a scan, when they inspect scan metadata, then they can see duration, pages crawled, skipped URL reasons, PageSpeed status, adapter failures, response limits, timeout limits, and concurrency policy.
- High: Given repeated local scans occur, when in-memory scan history grows, then it is bounded by policy.

### Implementation Result

Implemented:

- Request timeout policy in the worker fetch wrapper.
- Response byte accounting and oversized HTML truncation.
- Explicit `maxConcurrency: 1` sequential crawl policy.
- Observable crawl decisions, skipped reasons, adapter failures, duration, timeout, response limit, and concurrency metadata.
- PageSpeed timeout handling without invented performance evidence.
- Redacted assessment event path.
- Bounded in-memory scan history.
- Report UI visibility for operational scan details.
- Tests for timeout, response truncation, redirect boundary, event redaction, bounded history, PageSpeed timeout, and existing safe-crawl behavior.

### Goal Drift Review

1. What supports the mission?

   The assessment now better protects local business websites and North Valley Intel infrastructure while still producing plain-English lead-generation reports. Failures and skipped work are visible instead of hidden.

2. What is missing?

   Staging deployment has still not been run. Centralized observability dashboards and alerts remain Low for Phase 1 and are not implemented.

3. What is over-engineered?

   Nothing material. The added policies are small, testable safeguards directly tied to the refined mission.

4. What was deferred?

   Durable storage, centralized event export, PDF export, shareable report URLs, consultation CTA, analytics connectors, benchmark library, staging deployment execution, and production deployment.

5. Are we still helping local business owners understand why their website may not generate leads?

   Yes. The product still centers business-friendly lead-generation recommendations, and now does so with more honest limits and safer assessment behavior.

### Phase Gate Result

Under the refined mission, Phase 1 Critical and High local checks now pass on 2026-06-05.

Verified commands:

- `npm run format`
- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run test:integration`
- `npm run build`
- `npm audit --audit-level=moderate`

Staging deployment has not been run. Production remains blocked until staging succeeds and production is explicitly approved.

## 2026-06-05 MDE Status Reporting

Mission reviewed: Make Mission-Driven Engineering observable so progress is not hidden inside scattered code changes.

Phase goal reviewed: Phase 1 remains the active phase: URL input to safe public crawl to signal extraction to scoring to report page.

### Fresh BDD Scenarios

- Critical: Given a founder or engineer wants current project status, when they open `docs/operations/mde-status.md`, then they can see the active phase, phase goal, BDD generation, scenario counts, passing/failing status, test reuse, implementation changes, readiness, blockers, and goal drift review.
- Critical: Given a development session changes readiness, when the session ends, then `docs/operations/mde-status.md` is updated as the current status report.
- High: Given someone reviews release gates, when they inspect Phase 1 criteria, then they can see that a current MDE status report is required before release.
- Low: Given historical analysis is needed, when reviewing previous sessions, then `docs/operations/mdd-progress.md` remains the chronological log while `mde-status.md` remains the current snapshot.

### Implementation Result

Implemented:

- Added `docs/operations/mde-status.md`.
- Updated `docs/operations/bdd-session-playbook.md` to require updating the MDE status file at the end of every development session.
- Updated `docs/operations/release-gates.md` so Phase 1 requires a current MDE status report with no unresolved Critical or High local failures.

### Goal Drift Review

1. What supports the mission?

   The status report makes MDE progress explicit: what is being tested, what passed, what failed, what changed, and what still blocks release.

2. What is missing?

   The report is manually maintained for now. Automated generation could be useful later, but is not required for the current phase.

3. What is over-engineered?

   Nothing. A single markdown status file is intentionally simple.

4. What was deferred?

   Automated status generation and dashboarding were deferred.

5. Are we still helping local business owners understand why their website may not generate leads?

   Yes. This change improves engineering visibility and prevents hidden drift while the product remains focused on safe, plain-English website assessment.

## 2026-06-05 Self-QA Gate Update

Mission reviewed: Founder review should be used for product judgment, not basic bug discovery. MDE must include autonomous end-to-end validation before claiming readiness.

Phase goal reviewed: Phase 1 remains URL input to safe public crawl to signal extraction to scoring to report page.

### Fresh BDD Scenarios

- Critical: Given a phase, feature, or bug fix is claimed ready, when automated tests pass, then the system is also exercised end-to-end and actual UI/API output is inspected before founder review.
- Critical: Given self-QA finds stale, confusing, missing, or inconsistent behavior, when the issue is Critical or High, then it is fixed before readiness is claimed.
- Critical: Given a self-QA issue is fixed, when the session ends, then regression tests or existing coverage are updated so the issue does not silently return.
- High: Given MDE status is reviewed, when a session includes self-QA, then scenarios executed, actual results, issues found, fixes made, and remaining risks are visible in `docs/operations/mde-status.md`.

### Self-QA Results

Executed:

- Opened the local homepage.
- Submitted `https://example.com` through `POST /api/scans`.
- Inspected the API report output.
- Opened the generated report page.
- Inspected the report page for operational metadata.
- Opened `/admin` to verify scan history.

Observed:

- The homepage served the current Phase 1 app.
- The scan API returned a report with operational metadata including duration, timeout, response byte limit, concurrency, decisions, skipped URLs, and PageSpeed skip status.
- The report page displayed scan details and resource limits.
- `/admin` displayed the scan after the persistence fix.

Issue found:

- Critical: API-created scans could be lost across Next dev/server contexts because scan history was module-level memory only. This caused `/admin` to show no scans and report URLs to return 404 after creation.

Fix made:

- Added bounded file-backed local scan history in `apps/web/src/lib/scan-store.ts`.
- Verified API-created scans are readable from report and admin pages.
- Kept scan-history bound coverage in `apps/web/src/lib/scan-store.test.ts`.

### Process Update

Implemented:

- Added Self-QA Gate to `docs/operations/bdd-session-playbook.md`.
- Added Self-QA Gate to `docs/operations/release-gates.md`.
- Updated `docs/operations/mde-status.md` with scenarios executed, actual results observed, issues found, fixes made, and remaining risks.

### Goal Drift Review

1. What supports the mission?

   End-to-end self-QA catches real user-facing breakage that automated unit and integration tests missed.

2. What is missing?

   Browser automation could make the self-QA loop more repeatable later.

3. What is over-engineered?

   Nothing. The gate is procedural and documented, with one small persistence fix from actual QA.

4. What was deferred?

   Fully automated browser QA and production-grade durable storage.

5. Are we still helping local business owners understand why their website may not generate leads?

   Yes. The product now has a stronger readiness standard before asking for founder review.

## 2026-06-05 Two-Generation Readiness Gate Update

Mission reviewed: A phase is not ready after one successful BDD generation. MDE readiness requires two consecutive fresh BDD generations with no unresolved Critical or High failures and no implementation code changes between the two clean generations.

Phase goal reviewed: Phase 1 remains URL input to safe public crawl to signal extraction to scoring to report page.

### Fresh BDD Scenarios

- Critical: Given a phase has one clean BDD generation, when readiness is evaluated, then the phase is not marked ready until a second fresh generation also has no unresolved Critical or High failures.
- Critical: Given the first clean generation passes, when implementation code changes before the second generation, then the two-generation readiness loop resets.
- Critical: Given the second generation finds a new Critical or High failure, when readiness is evaluated, then code is unfrozen, the issue is fixed, and the two-generation loop repeats.
- High: Given MDE status is reviewed, when phase readiness is claimed, then both fresh BDD generations and their results are visible.

### Implementation Result

Implemented:

- Updated `docs/operations/bdd-session-playbook.md` with the two-generation readiness process.
- Updated `docs/operations/release-gates.md` with the Two-Generation Readiness Gate.
- Updated `docs/operations/mde-status.md` to record Generation 5 and Generation 6 results for Phase 1 async submission and score explainability.

### Current Two-Generation Result

- Generation 5: async submission and score explainability passed after implementation fixes.
- Implementation code freeze: after async job flow, score explanation model, legacy report normalization, and duplicate-key fixes.
- Generation 6: fresh BDD review from the same mission and phase goal found no unresolved Critical or High failures.
- Implementation code changes between clean Generation 5 and clean Generation 6: none.

### Goal Drift Review

1. What supports the mission?

   The gate reduces false readiness claims by forcing a second fresh review after implementation appears clean.

2. What is missing?

   The second generation is currently documented manually. Automation could help later.

3. What is over-engineered?

   Nothing. The process is stricter, but the implementation is documentation only.

4. What was deferred?

   Automated generation comparison and dashboarding.

5. Are we still helping local business owners understand why their website may not generate leads?

   Yes. The stricter gate protects the product from shallow readiness claims and keeps founder review focused on judgment rather than basic defects.

## 2026-06-05 Report Presentation Mission Refinement

Mission reviewed: The report is a customer-facing deliverable, not an engineering artifact. The report must help a local business owner quickly understand what is working, what is not working, what matters most, what should be fixed first, and why those fixes matter.

Phase goal reviewed: Phase 1 remains URL input to safe public crawl to signal extraction to scoring to report page.

### Fresh BDD Scenarios

- Critical: Given a completed assessment report, when a business owner opens it, then the first sections communicate the overall situation, biggest opportunity, and recommended actions before diagnostics.
- Critical: Given the report is customer-facing, when actual output is reviewed, then it follows the hierarchy Executive Summary, Biggest Opportunity, Top Recommended Actions, Score Summary, Supporting Evidence, Detailed Findings.
- Critical: Given detailed score evidence exists, when the report renders, then formulas and diagnostics are available but do not dominate the first decision path.
- Critical: Given a consultant presents findings, when they move through the report, then the page supports a professional business assessment narrative.
- High: Given visual elements are used, when the report is reviewed, then they improve understanding through scorecards, priority indicators, and action ranking.
- High: Given technical crawl metadata exists, when the report is reviewed, then metadata appears after business recommendations and supporting evidence.

### Implementation Result

Implemented:

- Reorganized report UI around the required decision-first hierarchy.
- Added Biggest Opportunity and Top Recommended Actions before score diagnostics.
- Added scorecards, priority indicators, impact/action cards, and restrained score badges.
- Moved detailed score formulas into expandable Detailed Findings.
- Moved technical assessment notes after the business sections.
- Added `apps/web/src/app/reports/report-page-structure.test.ts`.
- Updated product/testing/release docs and `docs/operations/mde-status.md`.

### Self-QA

Small business owner perspective:

- The top sections now communicate the grade, main opportunity, and first actions before score formulas or crawl metadata.
- The report can be scanned quickly without reading every diagnostic section.

Consultant-presenter perspective:

- The flow now supports a presentation narrative: summary, opportunity, actions, score context, evidence, then details for questions.
- Expandable details keep the report professional while preserving reviewability.

Actual output inspected:

- `/reports/example-com-1780696155007` included `Executive Summary`, `Lead readiness`, `Highest priority`, `Biggest Opportunity`, `Fix These First`, `Where The Website Stands`, `Why These Actions Matter`, `Review The Details`, `How this score was calculated`, and `Assessment Notes`.

### Two-Generation Result

- Generation 7: report organization and presentation scenarios passed after implementation.
- Code freeze: after report page hierarchy and structure test were added.
- Generation 8: fresh review found no unresolved Critical or High failures.
- Implementation code changes between clean Generation 7 and Generation 8: none.

### Goal Drift Review

1. What supports the mission?

   The report is now decision-oriented and better suited for a customer conversation.

2. What is missing?

   Screenshot-based visual QA, benchmark examples, and annotated screenshots are not implemented in Phase 1.

3. What is over-engineered?

   Nothing material. The page uses simple hierarchy, cards, and expandable detail sections.

4. What was deferred?

   PDF export, shareable report URLs, benchmark examples, annotated screenshots, and production-grade visual QA.

5. Are we still helping local business owners understand why their website may not generate leads?

   Yes. The report now prioritizes clarity, actionability, and business decision-making instead of surfacing diagnostics first.

## 2026-06-05 Turbopack Warning Risk Classification

Mission reviewed: Phase 1 must be honest about operational reliability, deployment limitations, and production readiness. Passing build output must not hide a storage architecture that is only acceptable for local/staging validation.

Phase goal reviewed: Phase 1 remains URL input to asynchronous safe public crawl to signal extraction to scoring to report page.

### Fresh BDD Scenarios

- Critical: Given `next build` emits a Turbopack tracing warning from filesystem-backed scan storage, when Phase 1 readiness is assessed, then the warning is documented as a known implementation risk rather than ignored.
- Critical: Given Phase 1 uses local filesystem-backed storage, when the risk is accepted, then acceptance is conditional on passing build, passing tests, working local/staging runtime behavior, documentation in MDE status and known limitations, and a Phase 2 or production-ready persistent-store replacement.
- Critical: Given a build passes with the Turbopack warning, when production readiness is evaluated, then the project does not treat that build as fully production-ready.
- High: Given release gates are reviewed, when storage readiness is inspected, then production remains blocked until filesystem-backed local storage is replaced with a proper persistent store.
- High: Given future phase planning is reviewed, when Phase 2 or production readiness is considered, then persistent storage replacement is listed as required work.

### Implementation Result

Implemented:

- Added `docs/operations/known-limitations.md`.
- Updated `docs/operations/mde-status.md` with the warning, acceptance criteria, readiness impact, and production blocker.
- Updated `docs/operations/release-gates.md` to make the warning conditionally acceptable for Phase 1 only.
- Updated `docs/product/phases.md` and `docs/engineering/deployment.md` to require replacing filesystem-backed storage before production readiness.

### Validation

Verified:

- `npm run format`
- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run test:integration`
- `npm run build`

Observed:

- Unit tests passed: 19 tests.
- Integration tests passed: 6 tests.
- Build passed and reproduced the Turbopack tracing warning through `apps/web/src/lib/scan-store.ts`.
- The warning remains classified as Phase 1 acceptable only under the documented conditions and does not make the app production-ready.

### Goal Drift Review

1. What supports the mission?

   The risk classification keeps operational limitations visible and prevents a passing build from being mistaken for production readiness.

2. What is missing?

   A proper persistent store has not been implemented.

3. What is over-engineered?

   Nothing. The change is documentation and release-gate clarification only.

4. What was deferred?

   Replacing filesystem-backed local storage with durable managed persistence was deferred to Phase 2 or production-readiness work.

5. Are we still helping local business owners understand why their website may not generate leads?

   Yes. This protects the assessment workflow from being released on a local-only storage assumption while preserving Phase 1 learning velocity.

## 2026-06-05 Evidence Sufficiency Failure

Mission reviewed: A customer-facing report must not present confident conclusions when the system did not collect enough meaningful public website evidence.

Phase goal reviewed: Phase 1 remains URL input to asynchronous safe public crawl to signal extraction to scoring to report page.

### Fresh BDD Scenarios

- Critical: Given a submitted website produces zero crawled pages, when assessment execution completes, then the system must not generate a normal scored customer-facing report.
- Critical: Given crawl or DNS failure prevents meaningful public page evidence collection, when status is checked, then the assessment is marked insufficient evidence rather than completed.
- Critical: Given content extraction reaches pages but extracts no meaningful readable text, when scoring would run, then scoring is blocked and the report is withheld.
- Critical: Given a report is generated from limited evidence, when a customer reads it, then the report clearly labels the assessment as partial and shows confidence limitations.
- Critical: Given the All Square Homes assessment is traced, when network access is available, then crawl, extraction, scoring, and report generation collect actual website evidence instead of producing a zero-page report.
- High: Given category scores are shown, when evidence is partial, then category confidence reflects the limited evidence.
- High: Given an operator reviews an insufficient-evidence scan, when they inspect status, then crawl failure reasons are visible without leaking secrets.
- High: Given release gates are reviewed, when Phase 1 readiness is claimed, then evidence sufficiency is a required gate.

### Investigation

Observed before the fix:

- Restricted local runtime could not resolve `www.allsquarehomes.com`.
- Worker output had `pagesCrawled: 0`, adapter failures for robots.txt and homepage fetch, and still returned a scored F report.
- Category confidence incorrectly appeared as medium even though no public page evidence was collected.

Observed with unrestricted network access:

- The All Square Homes homepage returned `200 OK` to the assessment user agent.
- The worker crawled 19 pages, respected robots exclusions, extracted phone/contact/local evidence, and produced a materially different report.

Root cause:

- Evidence was lost at the fetch/DNS step in the restricted runtime.
- The worker lacked an evidence sufficiency gate and treated crawl failure as missing business evidence.
- The web app marked any returned report as completed, so the customer-facing report appeared valid.

### Implementation Result

Implemented:

- Added evidence sufficiency evaluation before scoring.
- Added `InsufficientEvidenceError` for zero meaningful page evidence.
- Added `insufficient_evidence` assessment status.
- Added report-level evidence quality metadata for successful and partial assessments.
- Added partial-report confidence and limitations to the report UI.
- Updated tests to reject zero-page reports and preserve partial-report confidence.
- Updated mission, scoring, testing, release-gate, and MDE status docs.

### Validation

Verified:

- `npm run format`
- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run test:integration`
- `npm run build`

Observed:

- Unit tests passed: 21 tests.
- Integration tests passed: 6 tests.
- Build passed with the known Turbopack tracing warning from the filesystem-backed scan store.
- All Square Homes with unrestricted network access crawled 19 pages, produced evidence quality `successful`, confidence `high`, and no adapter failures.
- Local API self-QA for `https://evidence-sufficiency-test.invalid/` returned `insufficient_evidence` with no report payload.
- Local report route showed a status explanation instead of a scored report for the insufficient-evidence scan.

### Second Generation Result

- Generation 10 passed after implementation fixes.
- Code freeze: after evidence sufficiency gate, insufficient-evidence status, partial confidence display, redacted insufficient-evidence errors, and tests passed.
- Generation 11 fresh review found no unresolved Critical or High evidence sufficiency failures.
- Implementation code changes between clean Generation 10 and clean Generation 11: none.

### Goal Drift Review

1. What supports the mission?

   The product now refuses to convert infrastructure evidence loss into confident customer advice.

2. What is missing?

   Staging deployment has not been run. Production storage is still filesystem-backed and must be replaced before production readiness.

3. What is over-engineered?

   Nothing material. The evidence gate is small and directly tied to report trustworthiness.

4. What was deferred?

   More nuanced per-category evidence confidence and production-grade network diagnostics remain future improvements.

5. Are we still helping local business owners understand why their website may not generate leads?

   Yes, with an important correction: we only provide that advice when the system collected enough evidence to support it.

## 2026-06-05 Canonical Redirect Boundary Failure

Mission reviewed: Same-domain crawling must be safe without losing evidence from normal local-business website canonical redirects.

Phase goal reviewed: Phase 1 remains URL input to asynchronous safe public crawl to signal extraction to scoring to report page.

### Fresh BDD Scenarios

- Critical: Given a submitted apex domain redirects to its `www` hostname, when crawling follows the redirect, then the crawler treats it as the same submitted website rather than outside-domain evidence loss.
- Critical: Given a submitted `www` domain redirects to its apex hostname, when crawling follows the redirect, then the crawler treats it as the same submitted website rather than outside-domain evidence loss.
- Critical: Given a submitted site redirects to an unrelated hostname, when crawling follows the redirect, then the crawler still blocks it as outside the submitted domain.
- High: Given All Square Homes is submitted as the apex URL, when the updated worker runs, then it crawls meaningful pages and produces evidence quality instead of `insufficient_evidence`.

### Investigation

Observed:

- User self-test showed an insufficient-evidence message with `redirected outside submitted domain`.
- The crawler compared `finalUrl.hostname !== startedUrl.hostname`, so an apex-to-`www` redirect was treated like an unrelated-domain redirect.

Root cause:

- Same-domain boundary logic was too literal for common canonical redirects between apex and `www` hostnames.

### Implementation Result

Implemented:

- Added canonical hostname comparison that strips a leading `www.` for same-domain boundary checks.
- Kept unrelated-domain redirect blocking intact.
- Added a regression test for apex-to-`www` redirect handling.

### Validation

Verified:

- `npm run format`
- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run test:integration`
- `npm run build`

Observed:

- Unit tests passed: 22 tests.
- Integration tests passed: 6 tests.
- Build passed with the known Turbopack tracing warning.
- Live unrestricted worker self-QA against `https://allsquarehomes.com/` crawled 17 pages, followed the redirect to `https://www.allsquarehomes.com/`, and returned evidence quality `successful`.

### Second Generation Result

- Generation 12 passed after implementation fixes.
- Code freeze: after canonical apex/`www` hostname comparison and redirect regression test passed.
- Generation 13 fresh review found no unresolved Critical or High canonical redirect failures.
- Implementation code changes between clean Generation 12 and clean Generation 13: none.

### Goal Drift Review

1. What supports the mission?

   The crawler now preserves evidence through a normal canonical redirect while still protecting against unrelated-domain crawling.

2. What is missing?

   Staging deployment has not been run. Production storage is still filesystem-backed and must be replaced before production readiness.

3. What is over-engineered?

   Nothing. The change is a small boundary-rule correction.

4. What was deferred?

   Broader public suffix handling for complex multi-subdomain businesses remains future work.

5. Are we still helping local business owners understand why their website may not generate leads?

   Yes. This prevents a normal website redirect from becoming a false insufficient-evidence result.

## 2026-06-06 Evidence Traceability And Business Explainability Refinement

Mission reviewed: A business owner should be able to trace each score from summary to checks, evidence, business impact, existing-content distinction, and next action.

Phase goal reviewed: Phase 1 remains URL input to asynchronous safe public crawl to signal extraction to scoring to report page.

### Fresh BDD Scenarios

- Critical: Given a category score appears in the report, when a business owner reads the score summary, then the passed and missing checks are visible near the summary.
- Critical: Given a missing signal appears, when a business owner reads it, then the report explains why the missing signal matters in business language.
- Critical: Given existing content may serve a similar human-facing purpose, when an additional signal is recommended, then the report explains the difference between existing content and the recommended signal.
- Critical: Given score details are reviewed, when a customer asks why they received the score, then factor-level check name, pass/fail result, evidence, business explanation, existing-content note, and next action are available.
- High: Given LocalBusiness schema is missing, when the report explains it, then the explanation distinguishes human-readable business content from machine-readable business information.
- High: Given Google Business connection is missing, when the report explains it, then the explanation connects the website to local reputation and reviews in business language.
- High: Given PageSpeed is unavailable, when the report explains it, then it says performance measurement was unavailable and does not imply a measured performance defect.

### Implementation Result

Implemented:

- Added factor-level check names, business explanations, existing-content comparison notes, and next actions.
- Updated score summary cards to show passed and missing checks near each score.
- Added `What We Checked` traceability section.
- Updated supporting evidence and detailed findings to connect evidence to business impact and next actions.
- Updated mission, scoring, testing, release-gate, and MDE status docs.

### Goal Drift Review

1. What supports the mission?

   The report is now more understandable because scores can be traced directly to checks, evidence, why each signal matters, and what to do next.

2. What is missing?

   Final full local gate, report output self-QA, and the second clean BDD generation still need to complete before Phase 1 readiness can be reclaimed.

3. What is over-engineered?

   Nothing material. The added explanation fields are directly tied to customer understanding.

4. What was deferred?

   More nuanced industry-specific explanation libraries remain future work.

5. Are we still helping local business owners understand why their website may not generate leads?

   Yes. The report now does more than identify gaps; it explains why each gap matters and how it differs from content the business may already have.

## 2026-06-06 MDE Progress Visibility Refinement

Mission reviewed: Mission-Driven Engineering must be observable to the founder without requiring source-code inspection.

Phase goal reviewed: Phase 1 remains URL input to asynchronous safe public crawl to signal extraction to scoring to report page.

### Fresh BDD Scenarios

- Critical: Given the founder asks for status, when they open `docs/operations/mde-status.md`, then the top section shows current phase, phase goal, generation, scenario counts, blockers, missing inputs, external dependencies, self-QA, readiness, and recommendation.
- Critical: Given an external dependency prevents full validation, when MDE status is updated, then the missing dependency, impact, and result are prominent.
- Critical: Given code changes occur in a session, when the session ends, then MDE status is the primary artifact and code details are secondary.
- High: Given release gates are reviewed, when Phase 1 readiness is assessed, then founder-visible status reporting is required.

### Implementation Result

Implemented:

- Added a founder-facing status report section to `docs/operations/mde-status.md`.
- Added missing founder inputs, required credentials/access, and external dependency impact for `PAGESPEED_API_KEY`.
- Updated the BDD session playbook to prioritize progress visibility over code visibility.
- Updated release gates to require founder-facing MDE status reporting.

### Goal Drift Review

1. What supports the mission?

   The founder can now understand readiness, missing inputs, blockers, and next action without reading code.

2. What is missing?

   Automated generation of the status report remains future work.

3. What is over-engineered?

   Nothing. The change is documentation and reporting structure only.

4. What was deferred?

   Automated status dashboards and generated reports were deferred.

5. Are we still helping local business owners understand why their website may not generate leads?

   Yes. This keeps development aligned and makes missing validation inputs visible before customer-facing claims are made.

## 2026-06-06 PageSpeed Validation, Measured Performance Scoring, And MDE History

Mission reviewed: Help local business owners understand why their website may not be generating leads by safely analyzing public website evidence and giving plain-English, business-friendly recommendations. The mission now also requires operational reliability, evidence sufficiency, evidence traceability, external measurement truthfulness, self-QA, and observable MDE progress.

Phase goal reviewed: Phase 1 remains URL input to asynchronous safe public crawl to signal extraction to scoring to customer-facing report page.

### Fresh BDD Scenarios

- Critical: Given PageSpeed is configured but slower than normal crawl fetches, when performance measurement runs, then it uses a PageSpeed-specific bounded timeout rather than the crawl request timeout.
- Critical: Given PageSpeed is unavailable or fails, when scoring runs, then Performance is marked `Not measured`, excluded from the overall score, and excluded from top business problems.
- Critical: Given PageSpeed succeeds with a measured mobile score, when scoring runs, then Performance uses the measured score rather than scoring 100 for measurement presence.
- Critical: Given fewer than five categories are weak, when top business problems are generated, then healthy categories are not padded into the problem list.
- Critical: Given MDE progress must be observable historically, when a session changes mission, BDDs, tests, implementation, or readiness, then append-only history records capture what changed and why.
- High: Given the local PageSpeed key is configured, when status is reported, then local validation is shown separately from missing staging/production secrets.
- High: Given customer-facing impact copy is generated, when reports are inspected, then category wording is professional and does not contain repeated or awkward phrases.
- High: Given scoring docs are reviewed, when external measurements are unavailable or measured, then the scoring model explains how those states affect overall score and category score.
- High: Given future case-study publication is desired, when history is reviewed, then records make it possible to reconstruct phase, mission, BDD, test, implementation, self-QA, and readiness evolution.

### Implementation Result

Implemented:

- Added a PageSpeed-specific timeout policy of 45 seconds.
- Updated `.env.example` with `PAGESPEED_TIMEOUT_MS`.
- Updated Performance scoring so successful PageSpeed measurements use the measured score.
- Updated unavailable Performance behavior so skipped/failed PageSpeed is `Not measured` and excluded from overall score/top problems.
- Updated top business problem selection so healthy categories are not padded into the list.
- Cleaned up business-impact wording for category labels.
- Added tests for slow-but-successful PageSpeed, measured PageSpeed scoring, honest top-problem counts, and customer-facing copy quality.
- Added append-only MDE history under `docs/operations/mde-history/`.
- Updated the MDE playbook, release gates, scoring model, and current status report.

### Self-QA Results

- Direct PageSpeed API validation confirmed the local key works but can take longer than the previous 10-second crawl timeout.
- Direct All Square Homes worker self-QA crawled 17 pages with high-confidence evidence.
- PageSpeed returned successfully with a mobile score of 49/100.
- Performance scored 49/100 with a traceable formula and evidence.
- Top business problems included weak categories only; healthy Lead Conversion was not padded into the problem list.
- Customer-facing impact copy was inspected and no longer contains repeated `signals signals` wording.
- Local gate passed: format, lint, typecheck, 25 unit tests, 6 integration tests, and build.
- Build still emits the known Turbopack tracing warning from filesystem-backed scan storage.

### Goal Drift Review

1. What supports the mission?

   Measured PageSpeed evidence now produces truthful Performance scoring, unavailable external data is not blamed on the customer, and MDE progress is easier to inspect historically.

2. What is missing?

   A fresh local app report-page self-QA run and a second clean BDD generation are still required after Generation 15 code changes. Staging deployment validation remains missing.

3. What is over-engineered?

   Nothing material. The history files are documentation-heavy, but they directly support the founder's case-study and observability goal.

4. What was deferred?

   Automated MDE telemetry generation, centralized observability dashboards, staging PageSpeed secret validation, and production persistent storage remain deferred.

5. Are we still helping local business owners understand why their website may not generate leads?

   Yes. The report now better distinguishes measured website weaknesses from unavailable tooling and presents prioritized problems without invented padding.

## 2026-06-06 Generation 16 Second Clean Verification

Mission reviewed: Phase 1 must produce a safe, asynchronous, evidence-sufficient, explainable, decision-oriented local lead-generation assessment with observable MDE progress.

Phase goal reviewed: URL input to safe public crawl to signal extraction to scoring to customer-facing report page.

### Fresh BDD Scenarios

- Critical: Given the actual app receives a website URL, when the submit request returns, then it creates trackable assessment work immediately and does not wait for crawl/PageSpeed completion.
- Critical: Given the actual app assessment is executing, when status is polled, then it truthfully shows pending/running/completed and only exposes the report after completion.
- Critical: Given PageSpeed succeeds in the actual app run, when the report is inspected, then Performance score, evidence, formula, and business explanation match the measured PageSpeed score.
- Critical: Given the actual report page is inspected, when a business owner reads it, then recommendations appear before diagnostics and score summaries show passed/missing checks.
- Critical: Given MDE history is reviewed, when Generation 16 completes, then the status and history records show two clean generations with no implementation code changes between them.
- High: Given the second clean gate runs, when automated checks complete, then format, lint, typecheck, unit tests, integration tests, and build pass.
- High: Given All Square Homes is submitted through the app, when the assessment completes, then it collects meaningful evidence and does not show stale insufficient-evidence behavior.
- High: Given local readiness is reported, when staging and production are not validated, then those blockers remain prominent.
- High: Given build passes with the Turbopack warning, when readiness is assessed, then the warning remains documented as acceptable for Phase 1 local/staging only.

### Verification Result

Passed:

- App submit returned `pending` with `statusUrl` and `reportUrl`.
- Status progressed through `running` to `completed`.
- App API report showed 17 pages crawled, high-confidence evidence, PageSpeed 49/100, Performance 49/100, and no healthy-category padding.
- Report page HTML showed Executive Summary, Biggest Opportunity, Fix These First, Score Summary, Supporting Evidence, Evidence Traceability, Detailed Findings, and measured Performance explanation.
- Format, lint, typecheck, 25 unit tests, 6 integration tests, and build passed.
- Build still emits the documented Turbopack tracing warning.

### Goal Drift Review

1. What supports the mission?

   The actual app now demonstrates the intended customer flow end to end with truthful asynchronous status, meaningful evidence, measured scoring, and decision-oriented report presentation.

2. What is missing?

   Staging deployment validation, production approval, and production-ready persistent storage remain missing.

3. What is over-engineered?

   Nothing material. The MDE history is detailed because the founder explicitly requested a future case-study record.

4. What was deferred?

   Staging deployment execution, production deployment, persistent storage replacement, centralized observability, PDF export, shareable report URLs, and analytics connectors.

5. Are we still helping local business owners understand why their website may not generate leads?

   Yes. Local Phase 1 now exercises the full path from submission to report and presents the main business problems with traceable evidence and plain-English explanation.

## 2026-06-06 Competitive Validation Strategy

Mission reviewed: Phase 1 must validate assessment quality against realistic fixture sites, recurring public sites, external references where appropriate, and manual expert review where judgment is required. External validation references are internal development tools only, not production dependencies or feature-copying targets.

Phase goal reviewed: Phase 1 remains the complete vertical slice, now with a documented validation strategy required before readiness.

### Fresh BDD Scenarios

- Critical: Given Phase 1 uses validation references, when docs are reviewed, then Lighthouse, PageSpeed Insights, Screaming Frog, and HubSpot Website Grader are documented with strengths, gaps, openness, cost, API-key needs, suitability, and limitations.
- Critical: Given validation references are documented, when architecture is reviewed, then production dependencies are clearly separated from development-time validation references.
- Critical: Given scoring categories exist, when the validation matrix is reviewed, then every scoring/report category has an authoritative validation source and supporting validation sources.
- Critical: Given recurring validation is required, when candidate sites are reviewed, then five public non-client/non-prospect candidate sites are documented with industry, reason, validation value, robots considerations, and notes.
- Critical: Given validation runs need telemetry, when the site-validation template is reviewed, then it captures our assessment against Lighthouse, PageSpeed, Screaming Frog, and manual expert review with false positives, false negatives, score disagreements, report quality, and confidence.
- Critical: Given MDE progress must show quality trends, when status/history are reviewed, then validation runs and trend fields are part of the MDE reporting process.
- High: Given validation dependencies are missing, when status is reviewed, then missing founder inputs and external dependencies are prominent.
- High: Given score explainability is part of the mission, when validation is reviewed, then score explainability has explicit validation coverage.
- High: Given the report is customer-facing, when validation is reviewed, then report quality has explicit validation coverage.
- High: Given competitor tools are referenced, when docs are reviewed, then they are framed as validation references only and not feature-copying targets.
- High: Given Phase 1 readiness changed, when status is reviewed, then readiness is reset until the validation strategy gate gets a second clean pass.

### Implementation Result

Implemented:

- Added `docs/validation/reference-tools.md`.
- Added `docs/validation/validation-matrix.md`.
- Added `docs/validation/candidate-sites.md`.
- Added `docs/validation/templates/site-validation-template.md`.
- Updated product mission, testing strategy, release gates, BDD playbook, MDE status, MDE history, and progress log.

### Self-Review Findings

Strong validation coverage:

- URL validation safety.
- Robots.txt compliance.
- Same-domain and canonical apex/`www` redirect handling.
- No form submission.
- Max pages and max depth.
- Evidence sufficiency and insufficient-evidence handling.
- PageSpeed unavailable handling and measured Performance scoring.
- Score explanation structure.

Medium validation coverage:

- Broken links.
- Redirects.
- Metadata.
- Technical SEO basics.
- Lead conversion.
- Local visibility.
- Security and reliability.
- Report hierarchy.

Weak validation coverage:

- Trust signal quality.
- Message clarity quality.
- AI discoverability quality.
- Visual report quality beyond HTML/source inspection.
- False positive and false negative trends across recurring public sites.

Lacking or deferred validation:

- Automated comparison against Screaming Frog exports.
- Completed validation-run trend summaries.
- Screenshot-based report quality checks.
- Staging validation runs.

### Goal Drift Review

1. What supports the mission?

   The validation strategy makes assessment quality observable beyond happy-path tests and helps identify false positives, false negatives, weak explanations, and report-quality problems before customer use.

2. What is missing?

   Founder confirmation that candidate sites are not clients/prospects, Screaming Frog free-vs-paid decision, completed recurring validation runs, and staging validation.

3. What is over-engineered?

   Nothing material. The strategy is documentation and telemetry structure, not production integration.

4. What was deferred?

   Automated Screaming Frog export comparison, automated validation trend dashboards, screenshot QA, and full recurring-site validation runs.

5. Are we still helping local business owners understand why their website may not generate leads?

   Yes. The added validation process improves confidence that the crawler, scoring, explanations, and report quality are correct enough to support business decisions.

## 2026-06-06 Generation 18 Competitive Validation Second Clean Verification

Mission reviewed: Phase 1 requires documented validation references, validation matrix coverage, recurring public validation sites, score explainability validation, report quality validation, missing-input visibility, and MDE validation telemetry.

Phase goal reviewed: Complete vertical slice remains unchanged; competitive validation is an internal development process, not a customer-facing feature or production dependency.

### Fresh BDD Scenarios

- Critical: Given the same mission and Phase 1 goal, when reference-tool docs are reviewed fresh, then Lighthouse, PageSpeed Insights, Screaming Frog, and HubSpot Website Grader remain documented with strengths, gaps, openness, cost, API-key needs, suitability, and limitations.
- Critical: Given the same mission and Phase 1 goal, when architecture boundaries are reviewed fresh, then production dependencies remain clearly separated from validation references.
- Critical: Given scoring categories are reviewed fresh, when the validation matrix is inspected, then every scoring/report category still has validation coverage.
- Critical: Given recurring validation is reviewed fresh, when candidate sites and the site-validation template are inspected, then recurring sites and run telemetry fields remain present.
- Critical: Given MDE telemetry is reviewed fresh, when status/history are inspected, then validation-run and trend tracking requirements remain visible.
- Critical: Given the second clean gate runs, when validation artifacts and automated checks are verified, then no unresolved Critical validation-strategy failures remain.
- High: Given automated checks run after the second clean generation, then format, lint, typecheck, unit tests, integration tests, and build pass.
- High: Given missing validation dependencies remain, when status is reviewed, then founder inputs and external dependencies remain prominent.
- High: Given score explainability and report quality are reviewed fresh, then they remain explicit validation categories.
- High: Given local readiness is reported, when staging and production are not validated, then those blockers remain visible.
- High: Given build passes with the Turbopack warning, when readiness is assessed, then the warning remains documented as acceptable for Phase 1 local/staging only.

### Verification Result

Passed:

- Validation docs exist under `docs/validation/`.
- Artifact grep confirmed reference tools, production/reference separation, false positive/false negative fields, report quality validation, score explainability validation, and missing-input reporting.
- Format, lint, typecheck, 25 unit tests, 6 integration tests, and build passed.
- Build still emits the documented Turbopack tracing warning.
- No implementation changes were made between Generation 17 and Generation 18.

### Goal Drift Review

1. What supports the mission?

   The validation process now makes assessment quality measurable across crawler behavior, scoring, report quality, explainability, false positives, and false negatives.

2. What is missing?

   Completed validation runs across all candidate sites, founder confirmation of candidate-site status, Screaming Frog export decision, staging deployment, and production storage replacement.

3. What is over-engineered?

   Nothing material. The added documents are process artifacts, not product dependencies.

4. What was deferred?

   Automated validation-run aggregation, Screaming Frog export parsing, screenshot QA, and recurring-site run history.

5. Are we still helping local business owners understand why their website may not generate leads?

   Yes. The product remains focused on plain-English local lead-generation diagnosis, and the validation strategy improves our confidence that those diagnoses are correct and explainable.

## 2026-06-06 Candidate Validation Site Replacement

Founder feedback: All Square Homes is not suitable as a recurring validation candidate. Baird & Warner was also not a good replacement because the suite already includes Keller Williams for real estate coverage.

Change made:

- Replaced All Square Homes/Baird & Warner with Orkin in `docs/validation/candidate-sites.md`.

Reason:

- Add pest-control service coverage and avoid over-weighting real estate in the recurring validation suite.

Remaining input at the time:

- Founder still needed to confirm Orkin and the other candidate sites were not current clients or active prospects. This was resolved later on 2026-06-06.

## 2026-06-06 Founder Validation Inputs Resolved

Founder inputs received:

- Candidate validation sites confirmed as not current clients or active prospects.
- Screaming Frog free version selected for Phase 1 manual validation exports.
- Staging access and deployed PageSpeed secret configuration can wait.

Documentation updated:

- `docs/validation/candidate-sites.md`
- `docs/validation/validation-matrix.md`
- `docs/operations/mde-status.md`

Remaining input:

- Staging deployment target/access later.
- Staging and production PageSpeed secret configuration later.

## 2026-06-06 Generation 19 Recurring Competitive Validation Run

Mission reviewed: competitive validation should improve confidence in crawler correctness, assessment correctness, report quality, score explainability, feature coverage, and false positive/false negative detection.

Phase goal reviewed: Phase 1 complete vertical slice remains active; validation is internal MDE telemetry, not a customer-facing feature.

### Fresh BDD Scenarios

- Critical: Given the recurring validation suite is ready, when validation runs, then Orkin, Ace Hardware, Anytime Fitness, Jimmy John's, and Keller Williams are exercised and recorded.
- Critical: Given a public site yields extremely thin readable text, when evidence sufficiency is evaluated, then the system withholds the scored report as insufficient evidence.
- Critical: Given a site has insufficient evidence, when status/report output is generated, then a normal customer-facing scored report is not presented.
- Critical: Given validation telemetry is recorded, when the run is reviewed, then matched findings, missed findings, false positives, false negatives, report quality, and score explainability observations are visible.
- Critical: Given PageSpeed is unavailable during validation, when Performance is evaluated, then it remains unavailable rather than becoming a measured defect.
- Critical: Given validation finds a scoring trust issue, when it is fixed, then a regression test protects the behavior.
- High: Given a candidate site shows unusual runtime behavior, when validation is documented, then runtime risk is recorded.
- High: Given Screaming Frog and HubSpot outputs are unavailable, when validation is documented, then missing reference comparisons are explicit.
- High: Given automated checks run after validation-driven changes, then format, lint, typecheck, unit tests, integration tests, and build pass.
- High: Given MDE history is reviewed, then the validation run and evidence-sufficiency correction are recorded.
- High: Given code changed in Generation 19, then Phase 1 readiness resets until a second clean generation passes.

### Validation Result

Initial recurring validation run:

- Orkin completed with high-confidence evidence and PageSpeed 36/100.
- Ace Hardware completed with high-confidence evidence and PageSpeed 38/100.
- Anytime Fitness completed with high-confidence evidence but PageSpeed unavailable.
- Jimmy John's produced a low-confidence scored F report from only 201 readable characters.
- Keller Williams returned insufficient evidence.

Issue found:

- Critical: Jimmy John's should not receive a scored customer-facing report from extremely thin readable text.

Fix made:

- Added a minimum total readable-text evidence floor before scoring.
- Added a worker regression test for thin readable text being insufficient.

Post-fix validation rerun:

- Orkin completed with successful evidence; PageSpeed unavailable was handled honestly.
- Ace Hardware completed as partial due request failures; runtime telemetry was unusually high and recorded as a risk.
- Anytime Fitness completed with successful evidence; PageSpeed unavailable was handled honestly.
- Jimmy John's now returns insufficient evidence instead of a scored F report.
- Keller Williams remains insufficient evidence.

Automated gate:

- Format passed.
- Lint passed.
- Typecheck passed.
- Unit tests passed: 26.
- Integration tests passed: 6.
- Build passed with the known Turbopack tracing warning.

### Goal Drift Review

1. What supports the mission?

   The validation run found and fixed a real trust problem: scored advice based on extremely thin public text. This directly improves report honesty for business owners.

2. What is missing?

   Screaming Frog manual exports, HubSpot comparison output, stable PageSpeed availability across validation runs, screenshot QA, staging validation, and trend history across multiple runs.

3. What is over-engineered?

   Nothing material. The fix is a simple evidence gate and a regression test.

4. What was deferred?

   Automated Screaming Frog parsing, HubSpot automation, run-level timeout policy, screenshot QA, and validation trend dashboards.

5. Are we still helping local business owners understand why their website may not generate leads?

   Yes. The system now refuses to score a site when the public evidence is too thin to support trustworthy conclusions.

## 2026-06-06 Generation 20 Second Clean Post-Validation Verification

Mission reviewed: recurring validation should protect assessment trustworthiness and make quality improvements observable without adding production dependencies.

Phase goal reviewed: Phase 1 complete vertical slice with internal competitive validation telemetry.

### Fresh BDD Scenarios

- Critical: Given the same mission and Phase 1 goal, when evidence sufficiency is reviewed fresh, then extremely thin readable text remains insufficient for a scored report.
- Critical: Given the recurring validation run is reviewed fresh, then Jimmy John's and Keller Williams remain recorded as insufficient evidence outcomes.
- Critical: Given validation telemetry is reviewed fresh, then matched findings, missed findings, false positives, false negatives, report quality, and score explainability observations remain visible.
- Critical: Given PageSpeed is unavailable during validation, when documentation and tests are reviewed, then unavailable measurement remains distinct from measured defects.
- Critical: Given the second clean gate runs, when validation artifacts and automated checks are verified, then no unresolved Critical post-validation failures remain.
- Critical: Given MDE status/history are reviewed, then the two-pass result after Generation 19 is recorded.
- High: Given automated checks run after the second clean generation, then format, lint, typecheck, unit tests, integration tests, and build pass.
- High: Given runtime anomaly and missing-reference gaps remain, when status is reviewed, then they remain documented.
- High: Given local readiness is reported, when staging and production are not validated, then those blockers remain visible.
- High: Given build passes with the Turbopack warning, when readiness is assessed, then the warning remains documented as acceptable for Phase 1 local/staging only.
- High: Given Screaming Frog free comparison is deferred, when architecture is reviewed, then it remains a validation reference rather than a production dependency.

### Verification Result

Passed:

- Validation run record exists and includes all five candidate sites.
- Thin-text evidence sufficiency regression test remains in place.
- Format, lint, typecheck, 26 unit tests, 6 integration tests, and build passed.
- Build still emits the documented Turbopack tracing warning.
- No implementation changes were made between Generation 19 and Generation 20.

### Goal Drift Review

1. What supports the mission?

   The second clean pass confirms the validation-driven evidence-sufficiency fix holds without additional implementation churn.

2. What is missing?

   Staging validation, production storage replacement, manual Screaming Frog exports, and multi-run validation trends remain pending.

3. What is over-engineered?

   Nothing material. The validation telemetry is intentionally lightweight markdown.

4. What was deferred?

   Screaming Frog export parsing, screenshot QA, automated trend dashboards, staging deployment, and production deployment.

5. Are we still helping local business owners understand why their website may not generate leads?

   Yes. Phase 1 now has recurring validation evidence that the system withholds scored reports when public evidence is too thin and explains completed assessments with traceable evidence.

## 2026-06-07 Generation 21 URL Input Normalization

Mission reviewed: a non-technical business owner should be able to submit a normal public business domain without knowing to type `https://`.

Phase goal reviewed: Phase 1 complete vertical slice begins with successful URL input, so common business-domain input is Critical path behavior.

### Fresh BDD Scenarios

- Critical: Given a user enters `medinaclean.com`, when the assessment is submitted, then the system accepts it and normalizes it to `https://medinaclean.com/`.
- Critical: Given a user enters `www.medinaclean.com`, when the assessment is submitted, then the system accepts it and normalizes it to `https://www.medinaclean.com/`.
- Critical: Given a user enters `https://medinaclean.com`, when the assessment is submitted, then the system accepts it unchanged as a safe HTTPS URL.
- Critical: Given a user enters unsafe schemes such as `file://`, `javascript:`, `data:`, or `ftp://`, when validation runs, then the system rejects them.
- Critical: Given a user enters localhost, a private IP, or a malformed domain, when validation runs, then the system rejects it.
- Critical: Given a non-technical user types a normal business domain in the form, when browser validation runs, then the input field does not block submission before server normalization.
- High: Given validation fails, when the API returns an error, then copy says a public business website like `example.com` or `https://example.com` is acceptable.
- High: Given Medina Clean exposed a false negative, when MDE telemetry is reviewed, then Detection Accuracy records the false negative and fix.
- High: Given automated checks run after the URL normalization change, then format, lint, typecheck, unit tests, integration tests, and build pass.
- High: Given local API self-QA runs, then accepted and rejected cases are verified with HTTP status codes.
- High: Given code changed in Generation 21, then Phase 1 readiness resets until a second clean generation passes.

### Root Cause

- Shared URL validation required a fully qualified URL.
- The web form used strict browser URL validation.
- API error copy incorrectly told users to include `http://` or `https://`.

### Fix

- Normal public domains now normalize to HTTPS before safety checks.
- Unsafe schemes, malformed domains, localhost, and private IPs remain rejected.
- The form now uses `type="text"` with `inputMode="url"`.
- API error copy now accepts both `example.com` and `https://example.com` style inputs.

### Self-QA

- `medinaclean.com`: `202 Accepted`.
- `www.medinaclean.com`: `202 Accepted`.
- `https://medinaclean.com`: `202 Accepted`.
- `javascript:alert(1)`: `400 Bad Request`.
- `localhost:3000`: `400 Bad Request`.
- Format, lint, typecheck, 26 unit tests, 6 integration tests, and build passed.

### Goal Drift Review

1. What supports the mission?

   The first step of the assessment now matches how non-technical owners naturally type websites.

2. What is missing?

   HTTP fallback for bare domains whose HTTPS endpoint fails remains a future enhancement.

3. What is over-engineered?

   Nothing material. The change stays in the shared validation boundary and form input.

4. What was deferred?

   HTTP fallback, staging validation, and production deployment.

5. Are we still helping local business owners understand why their website may not generate leads?

   Yes. They can now start the assessment with a normal business-domain input.

## 2026-06-07 Generation 22 Second Clean URL-Normalization Verification

Mission reviewed: common business-domain input must work without weakening URL safety.

Phase goal reviewed: Phase 1 complete vertical slice starts with usable URL submission.

### Fresh BDD Scenarios

- Critical: Given the same mission and Phase 1 goal, when URL validation is reviewed fresh, then `medinaclean.com` remains accepted and normalized.
- Critical: Given the same mission and Phase 1 goal, when URL validation is reviewed fresh, then `www.medinaclean.com` remains accepted and normalized.
- Critical: Given HTTPS input is reviewed fresh, then `https://medinaclean.com` remains accepted.
- Critical: Given unsafe/local/malformed input is reviewed fresh, then unsafe schemes, localhost, private IPs, and malformed domains remain rejected.
- Critical: Given the report form is reviewed fresh, then browser validation does not block normal business-domain text.
- Critical: Given the second clean gate runs, then no unresolved Critical URL input failures remain.
- High: Given validation error copy is reviewed fresh, then it remains aligned with accepted input forms.
- High: Given Detection Accuracy telemetry is reviewed fresh, then the Medina Clean false negative remains documented.
- High: Given automated checks run after the second clean generation, then format, lint, typecheck, unit tests, integration tests, and build pass.
- High: Given local readiness is reported, then staging and production blockers remain visible.
- High: Given HTTP fallback is not implemented, then it remains documented as a future enhancement rather than hidden.

### Verification Result

Passed:

- Artifact checks found URL normalization tests and Medina Clean validation telemetry.
- Format, lint, typecheck, 26 unit tests, 6 integration tests, and build passed.
- Build still emits the documented Turbopack tracing warning.
- No implementation changes were made between Generation 21 and Generation 22.

### Goal Drift Review

1. What supports the mission?

   The URL input path remains usable for non-technical business owners while unsafe targets remain blocked.

2. What is missing?

   HTTP fallback for HTTPS failures, staging validation, and production storage replacement remain pending.

3. What is over-engineered?

   Nothing material. The solution stays centralized in shared validation.

4. What was deferred?

   HTTP fallback, staging deployment, production deployment, and persistent storage replacement.

5. Are we still helping local business owners understand why their website may not generate leads?

   Yes. The assessment can now be started with the way owners commonly type their website address.

## 2026-06-07 Generation 23 Trust Before Advice

Mission reviewed: the report must establish credibility by describing what was found before emphasizing missing signals or recommendations.

Phase goal reviewed: Phase 1 must produce a customer-facing report that helps a local business owner understand the website, not merely a technical score.

### Fresh BDD Scenarios

- Critical: Given a report includes found evidence, when the business owner reviews the biggest opportunity, then the report shows what was found before what still needs attention and before the recommendation.
- Critical: Given a category has missing signals, when detailed findings are reviewed, then found evidence, missing evidence, machine-readable or verifiable signal gaps, and recommendations are separated.
- Critical: Given a website has a `tel:` link, when signals are extracted and scored, then phone/contact evidence is acknowledged instead of being reported as absent.
- Critical: Given a website has crawlable city or service-area pages, when Local Visibility is scored, then found evidence includes concrete page examples.
- Critical: Given the report gives advice, when self-QA reviews it from a business-owner perspective, then recommendations do not appear to ignore existing evidence.
- High: Given report structure changes, when tests run, then found-before-missing-before-recommendation order is protected.
- High: Given evidence examples are available, when worker tests inspect category evidence, then phone and location examples appear in found evidence.
- High: Given the mission changed, when MDE telemetry is reviewed, then Trust Before Advice is recorded in mission evolution, status, progress, and generation history.
- High: Given implementation changed in Generation 23, when readiness is assessed, then local Phase 1 readiness resets until a second clean generation passes.

### Implementation

- Added Trust Before Advice to the mission.
- Updated the report so the biggest opportunity and detailed findings show `What We Found` before missing items and recommendations.
- Separated detailed findings into found evidence, missing evidence, machine-readable or verifiable signal gaps, recommendations, and score calculation.
- Treated `tel:` links as phone evidence.
- Added concrete examples to found evidence where phone, Google profile, service-area, or location-page evidence is available.

### Self-QA

- Business-owner review: the report now first acknowledges found evidence in the main opportunity and detailed findings before giving advice.
- Consultant review: the page now supports a presentation narrative of observed strengths, remaining gaps, why gaps matter, and recommended action.
- Fresh Medina Clean app run completed with 11 pages crawled, high-confidence evidence, grade B, and PageSpeed 75/100.
- Medina Clean Local Visibility now acknowledges phone evidence `+14704434817`, the `tel:+14704434817` call link, and multiple English/Spanish Woodstock service-area pages before listing the remaining Google Business connection gap.
- Fresh rendered report output showed `What We Found`, `What Still Needs Attention`, `What Is Missing`, `Machine-Readable Or Verifiable Signals`, and `Recommendation` in the intended customer-facing flow.
- Format, lint, typecheck, 28 unit tests, 6 integration tests, and build passed.
- Remaining risk: Generation 23 changed implementation, so local readiness requires a second clean Generation 24 pass.

### Goal Drift Review

1. What supports the mission?

   The report now works harder to earn trust before giving advice, reducing the chance that a customer feels existing website content was ignored.

2. What is missing?

   Screenshot-based visual QA and live Medina Clean re-assessment remain future validation work.

3. What is over-engineered?

   Nothing material. The change uses the existing report and factor model rather than adding a new scoring system.

4. What was deferred?

   Second clean Generation 24 verification, staging deployment, production deployment, and persistent storage replacement.

5. Are we still helping local business owners understand why their website may not generate leads?

   Yes. The report now starts from what the website already communicates, then explains what additional signals would improve lead generation.

## 2026-06-07 Generation 24 Second Clean Trust Before Advice Verification

Mission reviewed: Trust Before Advice remains part of the report-readiness mission.

Phase goal reviewed: Phase 1 remains the complete vertical slice from URL input to safe crawl, extraction, scoring, and customer-facing report.

### Fresh BDD Scenarios

- Critical: Given the same mission and Phase 1 goal, when the biggest opportunity is reviewed fresh, then found evidence remains before missing items and recommendations.
- Critical: Given detailed findings are reviewed fresh, then found evidence, missing evidence, machine-readable or verifiable signal gaps, recommendations, and score calculation remain separated.
- Critical: Given phone evidence from a `tel:` link is reviewed fresh, then it remains acknowledged as found evidence.
- Critical: Given city/service-area page examples are reviewed fresh, then they remain visible in found Local Visibility and AI Discoverability evidence.
- Critical: Given the second clean gate runs, then no unresolved Critical Trust Before Advice failures remain.
- High: Given automated checks run after the second clean generation, then format, lint, typecheck, unit tests, integration tests, and build pass.
- High: Given MDE telemetry is reviewed fresh, then Trust Before Advice remains recorded in status, history, progress, and mission docs.
- High: Given local readiness is reported, then staging and production blockers remain visible.
- High: Given the Turbopack warning remains, then it remains documented as acceptable for Phase 1 local/staging only and not production-ready.

### Verification Result

Passed:

- Artifact checks found Trust Before Advice mission text, report headings, evidence examples, `tel:` evidence tests, and MDE history records.
- Format, lint, typecheck, 28 unit tests, 6 integration tests, and build passed.
- Build still emits the documented Turbopack tracing warning.
- No implementation changes were made between Generation 23 and Generation 24.

### Goal Drift Review

1. What supports the mission?

   The second clean pass confirms the report still earns trust by acknowledging observed website evidence before advice.

2. What is missing?

   Staging deployment validation, production persistent storage, and screenshot-based visual QA remain missing.

3. What is over-engineered?

   Nothing material. The verification reused existing tests and artifacts.

4. What was deferred?

   Staging deployment, production deployment, persistent storage replacement, and optional screenshot-based QA.

5. Are we still helping local business owners understand why their website may not generate leads?

   Yes. The report now makes existing strengths visible before explaining remaining lead-generation gaps.

## 2026-06-07 Generation 25 Testimonial-Like Customer Proof Detection

Mission reviewed: Trustworthy reports must acknowledge real customer proof and avoid recommendations that appear to ignore existing evidence.

Phase goal reviewed: Phase 1 remains the complete vertical slice from URL input to safe crawl, extraction, scoring, and customer-facing report.

### Fresh BDD Scenarios

- Critical: Given customer review cards include named reviewers, star labels, and narrative recommendation language, when Trust Signals are extracted, then testimonial-like customer proof is detected.
- Critical: Given review/rating evidence exists, when testimonial-like proof is detected, then review/rating detection remains separate and still passes.
- Critical: Given Medina Clean previously produced a testimonial false negative, when a fresh assessment runs, then Trust Signals marks both Testimonials and Reviews or ratings as found.
- Critical: Given implementation changed in Generation 25, when readiness is assessed, then local readiness resets until a second clean generation passes.
- High: Given the regression suite runs, then testimonial-like review-card content is covered by unit tests.
- High: Given validation records are reviewed, then the Medina Clean testimonial false negative is marked fixed with remaining deterministic limitations.
- High: Given Trust Signals validation is reviewed, then coverage remains medium until more testimonial/review layouts are validated.
- High: Given automated checks run after the fix, then format, lint, typecheck, unit tests, integration tests, and build pass.

### Implementation

- Broadened testimonial detection to recognize customer-proof language inside review/customer context.
- Kept review/rating detection separate from testimonial-like proof detection.
- Added a regression test for named review cards, star labels, and narrative customer recommendation language.
- Updated validation records to mark the Medina Clean testimonial false negative fixed while retaining the deterministic-detection limitation.

### Self-QA

- Fresh Medina Clean app run completed with 11 pages crawled and high-confidence evidence.
- Trust Signals now passed both `Testimonials` and `Reviews or ratings`.
- Format, lint, typecheck, 29 unit tests, 6 integration tests, and build passed.
- Remaining risk: Generation 25 changed implementation, so local readiness required a second clean Generation 26 pass.

### Goal Drift Review

1. What supports the mission?

   The report now better recognizes customer proof that a business owner would reasonably expect it to understand.

2. What is missing?

   More recurring testimonial/review layouts are needed before Trust Signals detection can be called strong coverage.

3. What is over-engineered?

   Nothing material. The fix stays deterministic and does not introduce an AI scoring dependency.

4. What was deferred?

   More multilingual testimonial pattern coverage, screenshot-based QA, staging deployment, and production deployment.

5. Are we still helping local business owners understand why their website may not generate leads?

   Yes. The assessment now avoids telling owners testimonial-like customer proof is absent when review-card narratives already provide it.

## 2026-06-07 Generation 26 Second Clean Testimonial Detection Verification

Mission reviewed: Trustworthy evidence detection remains required for customer-facing recommendations.

Phase goal reviewed: Phase 1 remains the complete vertical slice.

### Fresh BDD Scenarios

- Critical: Given the same mission and Phase 1 goal, when testimonial-like customer proof detection is reviewed fresh, then the review-card regression remains covered.
- Critical: Given review/rating detection is reviewed fresh, then it remains separate from testimonial-like customer proof detection.
- Critical: Given Medina Clean validation is reviewed fresh, then the corrected false negative remains recorded.
- Critical: Given the second clean gate runs, then no unresolved Critical testimonial detection failures remain.
- High: Given automated checks run after the second clean generation, then format, lint, typecheck, unit tests, integration tests, and build pass.
- High: Given validation coverage is reviewed fresh, then Trust Signals remains medium coverage with remaining deterministic limitations visible.
- High: Given local readiness is reported, then staging and production blockers remain visible.
- High: Given the Turbopack warning remains, then it remains documented as acceptable for Phase 1 local/staging only and not production-ready.

### Verification Result

Passed:

- Artifact checks found the testimonial detection regression, validation run update, validation matrix update, and MDE records.
- Format, lint, typecheck, 29 unit tests, 6 integration tests, and build passed.
- Build still emits the documented Turbopack tracing warning.
- No implementation changes were made between Generation 25 and Generation 26.

### Goal Drift Review

1. What supports the mission?

   The second clean pass confirms the testimonial detection fix holds without more implementation churn.

2. What is missing?

   Additional recurring testimonial/review layout examples, staging deployment, and production storage replacement remain missing.

3. What is over-engineered?

   Nothing material.

4. What was deferred?

   More recurring validation examples, staging deployment, production deployment, and persistent storage replacement.

5. Are we still helping local business owners understand why their website may not generate leads?

   Yes. Trust Signals recommendations now better reflect customer proof already present on the website.

## 2026-06-08 Generation 27 No Negative Finding Without Evidence

Mission reviewed: reports must not say a signal is broken, missing, weak, or failed without concrete evidence a business owner can understand and verify.

Phase goal reviewed: Phase 1 remains the complete vertical slice from URL input to safe crawl, extraction, scoring, and customer-facing report.

### Fresh BDD Scenarios

- Critical: Given a customer-facing report says a signal is missing, then the failed factor includes evidence details showing what pages were checked and what related evidence was found.
- Critical: Given a broken image is reported, then the report shows source page, image URL, response code or request failure, and alt text when available.
- Critical: Given a broken link is reported, then the report shows source page, destination URL, and response code or request failure.
- Critical: Given phone number evidence is missing, then the report shows pages checked, phone-like text found, and `tel:` links found.
- Critical: Given location or service-area pages are missing, then the report shows pages checked and candidate location/service-area links found.
- Critical: Given testimonials are missing but reviews exist, then the report explains the difference between review/rating evidence and testimonial-like customer-story proof.
- Critical: Given actual report output is inspected, then negative findings render `Evidence reviewed` details before existing-content comparison and next action.
- High: Given image or link URLs contain HTML entities, then passive checks decode those URLs before checking them.
- High: Given the same internal asset appears on multiple pages, then passive checks do not repeatedly request the same URL.
- High: Given passive asset checks run, then they are bounded by candidate count and a shorter per-asset timeout.
- High: Given legacy local reports are loaded, then missing `evidenceDetails` is normalized without breaking report rendering.
- High: Given full local validation runs, then format, lint, typecheck, unit tests, integration tests, and build pass.
- High: Given MDE telemetry is reviewed, then the mission update, self-QA results, fixes, and readiness reset are recorded.

### Tests

- Reused existing Phase 1 worker, shared, report, scan-store, and integration tests.
- Added tests for phone/location negative evidence details, testimonial-negative explanation when reviews exist, broken-image proof details, escaped asset URL decoding, duplicate asset check bounding, and rendered evidence-detail UI.

### Implementation

- Added `evidenceDetails` to score factors.
- Added link/image detail extraction with source-page context, link labels, and image alt text.
- Added structured broken-asset evidence.
- Added default pages-checked evidence details for failed page-based checks.
- Rendered evidence details in Supporting Evidence, Evidence Traceability, and Detailed Findings.
- Fixed escaped URL handling and duplicate passive asset checks after Medina Clean self-QA exposed false-positive/resource risks.

### Self-QA

- Direct Medina Clean worker run completed with 11 pages and no broken-image false positive after decoding escaped URLs.
- Final local app run completed with 11 pages, high-confidence evidence, PageSpeed 62/100, and no broken internal images.
- Rendered report HTML contained `Evidence reviewed`, `evidence-detail-list`, pages checked, and no stale `Broken internal images were found` claim.
- Full gate passed: format, lint, typecheck, 35 unit tests, 6 integration tests, and build.
- Build still emits the documented Turbopack warning from filesystem-backed scan storage.

### Goal Drift Review

1. What supports the mission?

   The report now gives owners proof for negative findings, which makes recommendations more trustworthy and easier to verify.

2. What is missing?

   Screenshot-based visual QA, staging validation, and production persistent storage remain missing.

3. What is over-engineered?

   Nothing material. The change stays deterministic and does not add external validation dependencies.

4. What was deferred?

   Screenshot-based report QA, staging deployment, production deployment, and persistent storage replacement.

5. Are we still helping local business owners understand why their website may not generate leads?

   Yes. The report is less likely to make unsupported negative claims and more likely to show what was checked before giving advice.

## 2026-06-08 Generation 28 Second Clean No Negative Finding Verification

Mission reviewed: No negative finding without evidence remains part of the report-readiness mission.

Phase goal reviewed: Phase 1 remains the complete vertical slice.

### Fresh BDD Scenarios

- Critical: Given the same mission and Phase 1 goal, when negative findings are reviewed fresh, then failed factors still include evidence details.
- Critical: Given broken asset validation is reviewed fresh, then broken image/link proof details remain covered.
- Critical: Given escaped image URLs are reviewed fresh, then decoded URL checks remain covered.
- Critical: Given duplicate passive asset checks are reviewed fresh, then repeated internal asset URLs remain bounded.
- Critical: Given rendered report output is reviewed fresh, then `Evidence reviewed` details remain visible beside negative findings.
- Critical: Given the second clean gate runs, then no unresolved Critical no-negative-finding failures remain.
- High: Given automated checks run after the second clean generation, then format, lint, typecheck, unit tests, integration tests, and build pass.
- High: Given the Turbopack warning remains, then it remains documented as acceptable for Phase 1 local/staging only and not production-ready.
- High: Given local readiness is reported, then staging and production blockers remain visible.
- High: Given MDE telemetry is reviewed fresh, then Generation 27 and Generation 28 two-pass results are recorded.
- High: Given no implementation changes occur after Generation 27, then local readiness can be restored after Generation 28.

### Verification Result

Passed:

- Format, lint, typecheck, 35 unit tests, 6 integration tests, and build passed.
- Build still emits the documented Turbopack tracing warning.
- No implementation changes were made between Generation 27 and Generation 28.

### Goal Drift Review

1. What supports the mission?

   The second clean pass confirms the report does not regress to unsupported negative claims after the evidence-detail fixes.

2. What is missing?

   Staging validation, production persistent storage, and screenshot-based visual QA remain missing.

3. What is over-engineered?

   Nothing material.

4. What was deferred?

   Staging deployment, production deployment, persistent storage replacement, and screenshot-based report QA.

5. Are we still helping local business owners understand why their website may not generate leads?

   Yes. Local Phase 1 now produces more verifiable, trustworthy recommendations while preserving safe crawl behavior and resource limits.

## 2026-06-08 Generation 29 Cloudflare Staging Deployment Alignment

Mission reviewed: deployment must follow the North Valley Cloudflare standard and must not claim production readiness while storage and staging runtime gates remain unresolved.

Phase goal reviewed: Phase 1 remains the complete vertical slice, now moving from local validation to staging validation.

### Fresh BDD Scenarios

- Critical: Given this is a North Valley project, when deployment is configured, then the active deployment path is Cloudflare rather than Vercel.
- Critical: Given the app has dynamic API routes, when Cloudflare deployment is configured, then it uses Cloudflare Workers/OpenNext rather than static-only Pages output.
- Critical: Given staging is deployed, when readiness is assessed, then the actual staging hostname must resolve and runtime self-QA must pass before staging is considered validated.
- Critical: Given production is requested, when release gates are reviewed, then production remains blocked until filesystem-backed scan storage is replaced.
- Critical: Given others may call the utility, when API readiness is reviewed, then create/list/status/report endpoints are documented and external API hardening gaps are visible.
- High: Given Cloudflare build artifacts are generated locally, when format/lint/tests run, then generated output is ignored.
- High: Given CI runs, then it builds the Cloudflare/OpenNext Worker bundle.
- High: Given PageSpeed is configured locally, then the staging Worker has `PAGESPEED_API_KEY` configured as a secret.
- High: Given an accidental Vercel link was created, then the repo no longer keeps Vercel project link files.
- High: Given staging deploy runs, then MDE status records the Worker version, route, DNS blocker, and remaining production blocker.

### Verification Result

Passed:

- Cloudflare Worker `northvalley-assessment-staging` deployed.
- Worker route `staging-assessment.northvalleyintel.com/*` deployed.
- `PAGESPEED_API_KEY` uploaded as a staging Worker secret.
- Format, lint, typecheck, 35 unit tests, 6 integration tests, normal build, and Cloudflare/OpenNext build passed after generated-output ignores were added.

Blocked:

- `https://staging-assessment.northvalleyintel.com` does not resolve in DNS, so live staging runtime self-QA cannot run yet.
- Current Wrangler OAuth token has zone read permission but not DNS write permission.
- Production remains blocked by filesystem-backed scan storage.

### Goal Drift Review

1. What supports the mission?

   The app is now aligned with the Cloudflare deployment path used by the other North Valley projects, and the API surface is documented for future external use.

2. What is missing?

   Cloudflare DNS/proxy setup for the staging hostname, staging runtime self-QA, durable production storage, authenticated external API access, scheduled scans, and PDF download.

3. What is over-engineered?

   Nothing material. The deployment change follows the existing dynamic Next.js Cloudflare Worker pattern.

4. What was deferred?

   Production deployment, durable storage, scheduled scans, authenticated API access, and PDF report download.

5. Are we still helping local business owners understand why their website may not generate leads?

   Yes, but the deployed staging experience cannot be reviewed until DNS is fixed.

## 2026-06-09 Generation 30 Cloudflare Staging Runtime Stabilization

Mission reviewed: staging must prove the same business-facing assessment behavior that passed locally: asynchronous submission, truthful status, sufficient evidence before reports, explainable scores, and no unsupported customer-facing claims.

Phase goal reviewed: Phase 1 remains the complete vertical slice, now validated in the Cloudflare staging runtime.

### Fresh BDD Scenarios

- Critical: Given a founder or external caller submits a normal bare domain in staging, then the API creates a trackable pending assessment immediately.
- Critical: Given staging runs on Cloudflare Workers, then scan state persists across requests without relying on local filesystem storage.
- Critical: Given a scan has insufficient public evidence, then the system returns `insufficient_evidence` and does not show a completed report.
- Critical: Given a real public validation site can be assessed, then staging produces a completed report with crawled pages, evidence confidence, category evidence, and score explanations.
- Critical: Given same-domain safety is required, then staging report crawl metadata shows outside-domain links skipped rather than crawled.
- Critical: Given Worker runtime limits exist, then long scans must not remain `running` forever.
- High: Given Google PageSpeed is unavailable or times out in staging, then Performance is marked unavailable and no score is invented.
- High: Given staging deploys through Cloudflare, then the Worker has a D1 binding and the route remains attached.
- High: Given scan history is requested, then the D1-backed history endpoint returns persisted jobs.
- High: Given build warnings remain, then they are documented as risks rather than hidden.
- High: Given production is requested, then production remains blocked until a second clean generation and production-specific storage/secrets/DNS validation pass.
- High: Given MDE progress should be observable, then status/history documents record actual staging results.

### Verification Result

Passed:

- `npm run lint` passed.
- `npm run typecheck` passed.
- `npm run test` passed with 35 tests.
- `npm run test:integration` passed with 6 tests.
- `npm run build` passed with the known Turbopack tracing warning.
- `npm run cf:deploy:staging` passed and deployed Worker version `2bf3d06a-a857-4423-a340-b88a07455484`.
- Staging `POST /api/scans` accepted `example.com` and returned `202 pending`.
- Staging `GET /api/scans/example-com-1780974896397` returned `insufficient_evidence`, with no completed report.
- Staging `POST /api/scans` accepted `medinaclean.com` and returned `202 pending`.
- Staging `GET /api/scans/medinaclean-com-1780974928316` returned `completed`.
- Medina Clean staging report crawled 11 pages, skipped outside-domain links, produced grade `C`, score `79`, high evidence confidence, and traceable category evidence.

Failed then fixed:

- Staging initially returned 500 because the local filesystem scan store was incompatible with Cloudflare Workers.
- Staging jobs initially stayed `pending` because `setTimeout` was not reliable background execution after the submit response.
- A larger scan initially risked remaining `running` near the Worker execution limit.

Fixes made:

- Added Cloudflare D1-backed staging scan persistence through `ASSESSMENT_DB`.
- Converted scan-store callers to async.
- Added `ExecutionContext.waitUntil` for Cloudflare scan execution after the submit response.
- Added a Worker execution watchdog so scans reach a terminal failed state instead of hanging.

Remaining risks:

- The OpenNext generated bundle still warns that `../../tsconfig.base.json` is missing.
- `next build` still emits the documented Turbopack tracing warning.
- PageSpeed in staging can be unavailable under the Worker runtime budget and was honestly excluded from the Medina Clean score.
- Production still needs a separate D1 database, production `PAGESPEED_API_KEY`, production route/DNS, production self-QA, and a second clean Generation 31 verification.

### Goal Drift Review

1. What supports the mission?

   Staging now demonstrates the mission-critical public workflow: submit a site, track status, avoid low-evidence reports, complete a real evidence-backed report, and preserve same-domain crawl safety.

2. What is missing?

   A second clean post-fix generation, production configuration, production self-QA, and a dedicated background execution model for longer production scans.

3. What is over-engineered?

   Nothing material. D1 is the minimum deployment-compatible persistence needed for staging and future production alignment.

4. What was deferred?

   Production deployment, authenticated external API hardening, scheduled scans, PDF download, automated browser screenshot QA, and a dedicated queue/consumer execution architecture.

5. Are we still helping local business owners understand why their website may not generate leads?

   Yes. The staging product now avoids untrustworthy reports and can produce a customer-facing, evidence-backed assessment in the deployed environment.

## 2026-06-09 Generation 31 Post-Stabilization Verification

Mission reviewed: same refined Phase 1 mission with staging runtime trust, evidence sufficiency, and score explainability.

Phase goal reviewed: complete vertical slice with Cloudflare staging validation.

### Fresh BDD Scenarios

- Critical: Staging submission accepts a bare business domain and returns a trackable pending scan.
- Critical: Staging status persists through D1 and reaches terminal states.
- Critical: Insufficient evidence suppresses completed reports.
- Critical: Real public validation produces evidence-backed report output.
- Critical: Same-domain crawl safety is visible in crawl metadata.
- Critical: Score explanations remain reviewable and business-readable.
- High: Format, lint, typecheck, unit, integration, build, and Cloudflare build pass.
- High: PageSpeed unavailability is honest and not fabricated.
- High: MDE telemetry records actual staging output.
- High: Production remains blocked until production-specific gates pass.

### Verification Result

Failed then fixed:

- Initial `npm run format` failed for `apps/web/src/app/api/scans/route.ts`, `apps/web/src/lib/scan-store.ts`, and `apps/web/src/lib/scan-store.test.ts`.
- Ran `npm run format:write`; this was formatting only.

Passed after fix:

- Format, lint, typecheck, 35 unit tests, 6 integration tests, normal build, and Cloudflare/OpenNext build passed.
- Staging `example.com` scan returned `insufficient_evidence`.
- Staging `medinaclean.com` scan completed with 11 pages crawled, grade `C`, score `79`, high confidence, and outside-domain links skipped.

### Goal Drift Review

1. What supports the mission?

   The verification confirmed staging still produces truthful status and evidence-backed report output.

2. What is missing?

   A second clean pass with no implementation changes was still required because formatting changed during this generation.

3. What is over-engineered?

   Nothing material.

4. What was deferred?

   Production D1, production secrets, production route/DNS, production deploy, and production self-QA.

5. Are we still helping local business owners understand why their website may not generate leads?

   Yes, but the two-pass process correctly prevented claiming readiness immediately after a formatting fix.

## 2026-06-09 Generation 32 Second Clean Cloudflare Staging Verification

Mission reviewed: same mission and Phase 1 goal as Generation 31.

Phase goal reviewed: complete vertical slice with Cloudflare staging validation.

### Fresh BDD Scenarios

- Critical: Fresh verification finds no unresolved staging submission failure.
- Critical: Fresh verification finds no unresolved D1 persistence/status failure.
- Critical: Fresh verification finds no unresolved insufficient-evidence report-trust failure.
- Critical: Fresh verification finds no unresolved completed-report evidence failure.
- Critical: Fresh verification finds no unresolved same-domain crawl safety failure.
- Critical: Fresh verification finds no unresolved score explainability failure.
- High: Automated gates remain green.
- High: Cloudflare/OpenNext build remains deployable with documented warnings only.
- High: Staging terminal-state checks remain stable.
- High: No implementation code changes occur between Generation 31 post-fix and Generation 32.

### Verification Result

Passed:

- Format, lint, typecheck, 35 unit tests, 6 integration tests, normal build, and Cloudflare/OpenNext build passed.
- Staging `example-com-1780975606028` remained `insufficient_evidence`.
- Staging `medinaclean-com-1780975624607` remained `completed` with evidence-backed report output.
- Staging `/admin` returned HTTP 200.
- No implementation code changes occurred between Generation 31 post-fix and Generation 32.

### Goal Drift Review

1. What supports the mission?

   Phase 1 staging now demonstrates safe asynchronous assessment, honest insufficient-evidence handling, traceable scoring, and a completed customer-facing report in the deployed runtime.

2. What is missing?

   Production-specific storage, secrets, route/DNS, deploy, and self-QA remain missing.

3. What is over-engineered?

   Nothing material.

4. What was deferred?

   Production deployment, authenticated external API hardening, scheduled scans, PDF export, screenshot-based QA, and dedicated background execution.

5. Are we still helping local business owners understand why their website may not generate leads?

   Yes. The staging system now passes the two-generation readiness gate while preserving evidence quality and plain-English report behavior.
