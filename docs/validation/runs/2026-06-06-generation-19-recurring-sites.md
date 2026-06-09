# Validation Run: Generation 19 Recurring Sites

## Run Metadata

- Phase: Phase 1.
- Generation: 19.
- Date: 2026-06-06.
- Operator: Codex.
- Purpose: complete internal competitive validation pass across recurring candidate sites after founder confirmed candidates and selected Screaming Frog free for manual exports.
- Tools used: our assessment worker, Google PageSpeed Insights API when reachable, manual expert review from report/API output.
- PageSpeed API configured: yes locally.
- Screaming Frog export available: no.
- HubSpot Website Grader comparison available: no automated export; report-quality comparison remains qualitative.
- Lighthouse comparison available: indirectly through PageSpeed Insights when PageSpeed succeeds.

## Candidate Sites

| Site            | Industry                 | Outcome               | Pages crawled | Evidence status | Performance source          | Report quality signals                                    |
| --------------- | ------------------------ | --------------------- | ------------- | --------------- | --------------------------- | --------------------------------------------------------- |
| Orkin           | Pest control             | Completed             | 19            | Successful      | PageSpeed unavailable       | Evidence traceability, score explanation, actions present |
| Ace Hardware    | Retail and home services | Completed             | 20            | Partial         | PageSpeed unavailable       | Evidence traceability, score explanation, actions present |
| Anytime Fitness | Fitness franchise        | Completed             | 15            | Successful      | PageSpeed unavailable       | Evidence traceability, score explanation, actions present |
| Jimmy John's    | Restaurant               | Insufficient evidence | 1             | Insufficient    | Not run after evidence gate | Scored report correctly withheld                          |
| Keller Williams | Real estate brokerage    | Insufficient evidence | 0             | Insufficient    | Not run after evidence gate | Scored report correctly withheld                          |

## Key Findings

### Findings Matched

- The crawler respected the Phase 1 public-site limits and produced completed reports only when evidence was sufficient.
- Reports that completed included evidence traceability, score formulas, category explanations, and top actions.
- PageSpeed failures were treated as unavailable Performance measurement rather than measured website weakness.
- Jimmy John's no longer receives a scored F report from extremely thin extracted text.
- Keller Williams remains insufficient evidence rather than a scored report.

### Findings Missed

- Screaming Frog crawl comparisons were not available because no manual export was provided.
- HubSpot Website Grader comparisons were not captured because the public grader does not provide a stable automated export for this workflow.
- Lighthouse comparison was incomplete in the second run because PageSpeed was unavailable for completed sites.

### False Positives

- Before the fix, Jimmy John's was a false-positive scored report: one thin public page with 201 readable characters produced an F assessment. This is now fixed by treating very thin readable text as insufficient evidence.

### False Negatives

- None confirmed in this run.
- Potential false negatives remain unverified for broken links, redirects, and metadata until Screaming Frog manual exports are compared.

### Report Quality Observations

- Completed reports had top actions, evidence traceability, and score explanations.
- Insufficient-evidence outcomes were more trustworthy than low-confidence scored reports for sites with too little readable text.
- PageSpeed unavailable explanations remained honest and did not lower scores as if performance had been measured poorly.

### Score Explainability Observations

- Completed category scores had formulas and confidence values.
- Unavailable Performance stayed explicit and excluded from overall score/top-problem ranking.
- The thin-text fix improves explainability because the system no longer asks customers to interpret detailed scores built from inadequate evidence.

## Site Notes

### Orkin

- Outcome: completed.
- Pages crawled: 19.
- Evidence: successful, high confidence.
- Overall score: 88, grade B.
- Top problems: Local Visibility, Security & Reliability.
- PageSpeed: unavailable in this run.
- Validation value: strong service-business coverage for pest control, local pages, CTAs, trust, AI discoverability, and report prioritization.

### Ace Hardware

- Outcome: completed.
- Pages crawled: 20.
- Evidence: partial, medium confidence due public request failures.
- Overall score: 83, grade B.
- Top problems: Security & Reliability, Local Visibility, Trust Signals.
- PageSpeed: unavailable in this run.
- Runtime observation: elapsed-time telemetry was unusually high and should be watched in future validation runs.
- Validation value: useful for large public site crawl behavior, metadata, redirects, and reliability checks.

### Anytime Fitness

- Outcome: completed.
- Pages crawled: 15.
- Evidence: successful, high confidence.
- Overall score: 77, grade C.
- Top problems: Trust Signals, Local Visibility.
- PageSpeed: unavailable in this run.
- Validation value: useful for franchise/location patterns and local lead-generation checks.

### Jimmy John's

- Outcome: insufficient evidence after fix.
- Reason: the assessment reached the website but extracted too little readable public page text to support a trustworthy scored report.
- Validation value: important regression case for thin-text evidence sufficiency and report withholding.

### Keller Williams

- Outcome: insufficient evidence.
- Reason: the assessment reached the website but could not extract enough readable public page text to support a trustworthy report.
- Validation value: important regression case for JS-heavy or low-readable-content sites.

## Remaining Validation Gaps

- Screaming Frog free manual exports still need to be run and compared for crawl coverage, broken links, redirects, and metadata.
- PageSpeed should be rerun for completed sites when the API is reachable to complete Performance comparison.
- Screenshot-based report quality QA remains deferred.
- Trend summaries require multiple validation runs over time.

## Readiness Decision

Competitive validation is acceptable for Phase 1 local readiness after the thin-text evidence fix and rerun. It is not complete for staging or production readiness because staging validation, production storage, and recurring trend history are still pending.
