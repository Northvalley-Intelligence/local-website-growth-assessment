# Scoring Model

The score is deterministic and evidence-based. AI may explain results later, but it must not invent evidence or change the underlying score.

## Categories And Weights

- Local Visibility: 20%
- Lead Conversion: 20%
- Trust Signals: 15%
- Message Clarity: 15%
- Mobile Experience: 10%
- AI Discoverability: 10%
- Performance: 5%
- Security & Reliability: 5%

The overall score is the sum of each scored category multiplied by its category weight. If an external measurement is unavailable, such as PageSpeed failing or not being configured, that category is marked `Not measured`, excluded from the overall score denominator, and excluded from top-problem ranking. Missing measurement is not treated as a zero.

Scores are generated only after the worker confirms evidence sufficiency. A zero-page crawl or a crawl with no meaningful readable public page text must not produce normal category scores.

## Category Formula

Each category has a fixed set of evidence factors. A factor either passes or is missing based on extracted public website signals.

Category score:

`passed factors / total factors * 100`

Weighted contribution:

`category score * category weight / 100`

Every category report includes:

- score or `Not measured` status
- category weight
- passed factor count
- total factor count
- weighted contribution
- found evidence
- missing evidence
- factor-level pass/fail details
- check name
- business-language explanation
- existing-content versus recommended-signal note
- recommended action for the factor
- business impact
- recommended fix
- confidence

## Evidence Factors

Evidence factors come from public crawl output, passive checks, and optional PageSpeed data. Examples include visible phone numbers, click-to-call links, contact paths, testimonials, reviews, LocalBusiness schema, location pages, service descriptions, FAQ content, HTTPS, broken links, sitemap, favicon, and Open Graph image.

Each factor must answer:

- What was checked?
- What was found or missing?
- Why does this matter to local lead generation?
- Could existing content cover a similar human-facing need?
- What additional signal or action is recommended?

The scoring math remains deterministic, but explanations must be business-readable and traceable. The report should show passed and missing checks close to the category summary so the score does not feel like a black box.

## Confidence

Phase 1 confidence is simple and conservative. Scores are marked with a confidence value so North Valley Intel can review how much support exists for the result. Confidence does not mean legal, SEO, accessibility, or security compliance.

Report-level evidence quality is evaluated before scoring:

- Successful: enough meaningful public website text was collected to support a normal report.
- Partial: at least one meaningful page was collected, but evidence is limited by page count, text volume, or crawl failures.
- Insufficient evidence: no meaningful public page evidence was collected, so no scored customer report should be shown.
- Failed: the assessment process failed unexpectedly.

Category confidence follows the available evidence. Partial reports must make limitations visible. Skipped or failed PageSpeed data makes the performance category unavailable rather than low-scoring, because the system did not collect measured performance evidence.

## Known Limitations

- The crawler only assesses public pages within Phase 1 limits.
- Mobile checks are passive signals, not full visual layout audits.
- PageSpeed is skipped when no API key is configured.
- PageSpeed is marked unavailable when the API is slow, unavailable, or fails. That unavailable state must be explained plainly and must not lower the overall score as if performance was measured poorly.
- Missing evidence means the crawler did not find it, not proof that the business lacks it.
- If the crawler collects no meaningful website evidence, the system should show insufficient evidence rather than a low-scoring report.
- Existing content can support human trust while still missing a different machine-readable or verifiable signal.
- The scoring model is intended to explain local lead-generation opportunities, not to rank SEO performance generally.
