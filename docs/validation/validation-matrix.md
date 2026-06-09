# Validation Matrix

No scoring category should exist without a documented validation strategy. This matrix defines the validation sources used to improve correctness, coverage, explainability, and report quality during development.

## Validation Source Roles

Production dependency:

- PageSpeed Insights API: allowed production dependency for Performance only.

Development-time validation references:

- Lighthouse.
- Screaming Frog SEO Spider.
- HubSpot Website Grader.
- Manual expert review.
- Internal tests.
- Fixture sites.
- Recurring public validation sites.

Validation-reference tools are not production architecture dependencies.

## Category Matrix

| Category               | Authoritative source                        | Supporting validation sources                                                   | What to compare                                                                                         | Current coverage                                    |
| ---------------------- | ------------------------------------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| Performance            | PageSpeed Insights API when configured      | Lighthouse, internal tests, fixture sites                                       | Mobile score, unavailable measurement behavior, score explanation, business translation                 | Strong locally; staging/prod key validation missing |
| Broken Links           | Internal crawler tests and fixture sites    | Screaming Frog manual export, manual review                                     | Internal broken links, broken images, status-code differences, false positives, false negatives         | Medium                                              |
| Redirects              | Internal crawler tests and fixture sites    | Screaming Frog manual export, manual review                                     | Same-domain redirects, apex/`www` redirects, outside-domain redirects, redirect loops                   | Medium                                              |
| Metadata               | Internal extraction tests and fixture sites | Screaming Frog, Lighthouse SEO                                                  | Title, meta description, Open Graph image, favicon, sitemap                                             | Medium                                              |
| Technical SEO          | Internal tests for supported checks         | Lighthouse SEO, Screaming Frog                                                  | Robots, sitemap, canonical crawlability where supported, metadata                                       | Medium; Phase 1 intentionally limited               |
| Trust Signals          | Manual expert review                        | Fixture sites, recurring public sites                                           | Testimonials, reviews, real photos, about/team/owner page, credentials, years in business, case studies | Weak to medium; needs recurring manual review       |
| Lead Conversion        | Manual expert review                        | Fixture sites, recurring public sites, HubSpot presentation comparison          | Phone, click-to-call, forms, CTAs, contact path, business owner usefulness                              | Medium                                              |
| Message Clarity        | Manual expert review                        | Fixture sites, recurring public sites                                           | Clear service, area, customer type, differentiation, vague messaging                                    | Weak to medium                                      |
| Local Visibility       | Manual expert review                        | Fixture sites, recurring public sites, Screaming Frog for crawlable local pages | City/service-area mentions, NAP, LocalBusiness schema, service-area pages, Google Business connection   | Medium                                              |
| AI Discoverability     | Manual expert review                        | Fixture sites, recurring public sites                                           | FAQ, structured content, crawlable service/location pages, specificity for AI assistants                | Weak; requires manual judgment                      |
| Security & Reliability | Internal passive checks                     | Lighthouse best practices, Screaming Frog, manual review                        | HTTPS, robots, sitemap, broken links/images, favicon, Open Graph image, basic security headers          | Medium                                              |
| Report Quality         | Manual expert review                        | HubSpot Website Grader, founder review, fixture reports                         | One-minute comprehension, hierarchy, actionability, professional appearance, no technical walls of text | Medium; screenshot QA deferred                      |
| Score Explainability   | Internal tests and manual expert review     | Fixture reports, recurring public sites                                         | Evidence found, evidence missing, score formula, confidence, why it matters, next action                | Strong structurally; recurring validation needed    |
| Evidence Sufficiency   | Internal tests and fixture sites            | Manual review, recurring public sites                                           | Successful/partial/failed/insufficient outcomes, confidence, report withholding                         | Strong locally                                      |
| Detection Accuracy     | Internal tests and validation runs          | Manual review, recurring public sites                                           | True positives, true negatives, false positives, false negatives, disagreements                         | Medium                                              |

## Validation Strength Definitions

- Strong: automated tests plus self-QA or external-reference comparison exist.
- Medium: automated tests or manual review exist, but recurring external comparison is incomplete.
- Weak: mostly manual judgment or early heuristics; requires recurring validation examples.
- Missing: no meaningful validation path exists.

## Current Self-Review Findings

Strong validation coverage:

- URL validation safety.
- Common business-domain URL normalization.
- Robots.txt compliance.
- Same-domain and apex/`www` redirect handling.
- No form submission.
- Max pages and max depth.
- Evidence sufficiency and insufficient-evidence status.
- Thin readable-text blocking before scored reports.
- PageSpeed unavailable handling.
- Measured PageSpeed Performance scoring.
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
- Visual presentation quality beyond HTML/source inspection.
- False positive and false negative trends across recurring public sites.

Validation lacking entirely:

- Automated comparison against Screaming Frog exports.
- Formal recurring validation-run trend summaries.
- Screenshot-based report quality checks.
- Staging validation runs.

Validation-run issue found on 2026-06-06:

- Jimmy John's produced only 201 readable characters and was initially treated as a low-confidence partial scored report. That was reclassified as insufficient evidence because the text volume was too thin for a trustworthy scored report.

Validation-run issue found on 2026-06-07:

- `medinaclean.com` was rejected because the system required a fully qualified URL and the UI used browser URL validation. This was reclassified as a Critical URL input usability false negative. Bare domains are now normalized to HTTPS while unsafe schemes and local/private hosts remain rejected.

Validation-run issue found on 2026-06-07:

- Medina Clean includes customer review cards with named reviewers, 5-star visuals, and narrative customer comments. The assessment correctly detected reviews but initially did not detect testimonial-like content because testimonial detection only searched for narrow keywords such as `testimonial` and `happy customer`. This was classified as partial detection with a testimonial false negative. The detector now recognizes testimonial-like customer proof when review/customer context appears with customer-story language, and a regression test covers the pattern. Trust Signals detection remains medium coverage because more testimonial/review layouts need recurring validation.

External dependencies still needed:

- Screaming Frog free desktop access if manual crawl exports are used.
- Staging PageSpeed API key/secret configuration.
- Deployment target access for staging.

Founder inputs still needed:

- Staging deployment target/access.
- Staging and production PageSpeed secret configuration.

Founder inputs received:

- Candidate validation sites confirmed as not current clients or active prospects on 2026-06-06.
- Screaming Frog free version selected for Phase 1 manual validation exports on 2026-06-06.
