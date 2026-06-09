# Why

Local business websites often fail to turn visitors into leads because important business signals are hard to find, unclear, missing, or slow to load.

The mission is to explain those issues in plain English so owners can make better decisions without needing SEO, analytics, or engineering expertise.

That mission only works if the assessment system is trustworthy operationally. A tool that crawls carelessly, hides failure, overloads a small business website, or validates itself only against happy-path examples would undermine the same business owners it is meant to help.

## Operational Reliability

The assessment must fail safely and explain limits honestly. If a crawl cannot complete, PageSpeed is unavailable, a website blocks the crawler, or a page cannot be fetched, the product should show what was checked, what was skipped, and why. It should not turn infrastructure failure into confident business advice.

## Evidence Sufficiency

A customer-facing report must be based on enough meaningful public website evidence to support its conclusions. If no public pages are crawled, readable content cannot be extracted, or the collected evidence is too thin to evaluate the website fairly, the system must not present a normal scored report.

The assessment must distinguish between successful assessment, partial assessment, insufficient evidence, and failed assessment. Partial assessments may still produce a report, but they must show confidence limits and explain what was incomplete. Insufficient-evidence assessments must withhold the scored report and explain why no trustworthy conclusions can be made.

Missing evidence should never be presented as proof that a business lacks something when the crawler did not collect enough website evidence to check.

## Trust Before Advice

The report should establish credibility by accurately describing what was found before emphasizing what is missing or recommending changes. A business owner should feel that the report understands their website before hearing advice.

Report sections should prefer this order:

1. What We Found.
2. What Is Missing.
3. Machine-readable or verifiable signals missing.
4. Recommendations.

When evidence exists, the report should acknowledge it explicitly. For example, if location or service-area pages were found, the report should say that before recommending additional local visibility improvements. If human-readable content exists but a machine-readable signal is missing, the report should explain that distinction instead of making the recommendation sound like it ignored existing content.

Never present a recommendation that appears to ignore existing evidence. Before report readiness is claimed, self-QA must ask whether the business owner would feel the report understood their website. If not, the explanation is incomplete.

## Evidence Traceability And Business Explainability

Every summary statement should be traceable to the checks and evidence that support it. A business owner should not have to search the report to understand what was checked, what passed, what was missing, and how that produced the score.

The report should connect:

- Summary to details.
- Score to evidence.
- Evidence to business impact.
- Missing item to why it matters.
- Existing content to the additional signal being recommended.

Technical findings must be translated into business language. For example, missing structured business data should explain that the website may contain human-readable business information while still missing machine-readable information that helps Google, AI assistants, and local discovery systems understand the business.

The report must distinguish between content that exists, a business signal that exists, a signal that is machine-readable, and a signal that is verifiable. A biography page, service page, review quote, or contact page may help human visitors, but the report should explain when an additional signal serves a different purpose.

Before report readiness is claimed, self-QA must ask whether a non-technical business owner can understand what was checked, what was found, what was missing, why it matters, whether they already have something similar, and what specific action to take next.

## No Negative Finding Without Evidence

The report must not say something is broken, missing, weak, or failed unless it shows enough concrete evidence for a business owner to understand and verify the claim.

Negative findings must be traceable from summary to detail. If the report says a link is broken, it should show the source page, destination URL, and response code or request failure. If it says an image is broken, it should show the source page, image URL, response code or request failure, and alt text or label when available. If it says a phone number, service-area page, testimonial, or other business signal was not found, it should show which important pages were checked and what related evidence was found instead.

The report should lower confidence or explain limits when evidence is incomplete instead of presenting the finding as certain. A recommendation should never make the owner feel that the report ignored observable evidence already present on the website.

## Observability

The system needs enough internal visibility to operate responsibly: crawl attempts, skipped URLs, robots.txt decisions, PageSpeed status, adapter failures, duration, page counts, and report-generation outcomes should be observable without storing unnecessary raw HTML or secrets. Logs and events should help an operator understand assessment behavior while preserving the data-handling limits of the product.

## Resource Protection

The crawler must protect both the assessed website and North Valley Intel infrastructure. It should enforce same-domain crawling, robots.txt, private/admin path avoidance, max page count, max depth, request timeouts, polite delay, response-size limits, and bounded concurrency. Resource limits are part of the product promise, not just implementation details.

## Realistic Validation

Tests should reflect realistic website behavior, not only idealized pages. Validation should include mocked sites with redirects, broken pages, robots exclusions, slow or failed responses, non-HTML assets, forms, external links, missing metadata, and partial evidence. Passing tests should mean the product can handle common local-business website conditions without fabricating certainty.

## Competitive Validation

The product should be validated against external references where appropriate, but those references are development-time validation tools only. The purpose is to improve crawler correctness, assessment correctness, report quality, score explainability, feature coverage, and false positive/false negative detection. The purpose is not to copy competitor features or make competitor tools part of the production architecture.

Validation should compare our assessment against:

- Lighthouse where page-level performance, accessibility, best-practice, and SEO checks are relevant.
- Google PageSpeed Insights where measured Performance scoring is relevant.
- Screaming Frog SEO Spider where crawl coverage, broken links, redirects, metadata, and technical crawl behavior need comparison.
- HubSpot Website Grader where owner-friendly report framing and broad website-health presentation are useful references.
- Manual expert review where local lead-generation quality, trust, message clarity, AI discoverability, and report usefulness require judgment.
- Fixture sites and recurring public validation sites where repeatability is required.

The only planned external assessment dependency in production is Google PageSpeed Insights API. Lighthouse, Screaming Frog, HubSpot Website Grader, Semrush, Ahrefs, GTmetrix, and similar tools are validation references only unless a future phase explicitly changes the architecture.

No scoring category should exist without a documented validation strategy. Validation should be recorded as MDE telemetry so North Valley Intel can track whether assessment quality improves across generations.

## Mission Refinement

The refined mission is: help local business owners understand why their website may not be generating leads by safely and reliably analyzing enough publicly accessible website information to support trustworthy conclusions, protecting assessed sites and system resources, making assessment behavior observable, validating against realistic website conditions and appropriate external references, and generating plain-English, business-friendly recommendations with clear evidence and honest limits.

## Report Quality

The report is a customer-facing deliverable, not an engineering artifact. The mission is not to maximize findings, scores, metrics, page length, or technical detail.

The report should help a local business owner quickly understand:

- What is working.
- What is not working.
- What matters most.
- What should be fixed first.
- Why those fixes matter.

Reports must be decision-oriented rather than information-oriented. A business owner should be able to understand the overall situation within approximately one minute.

The report hierarchy is:

1. Executive Summary.
2. Biggest Opportunity.
3. Top Recommended Actions.
4. Score Summary.
5. Supporting Evidence.
6. Detailed Findings.

The most important recommendations should appear before detailed diagnostics. The report should feel like a professional business assessment rather than a technical audit.

Visual presentation should communicate clarity, confidence, professionalism, trustworthiness, and actionability. Visual elements should be used only when they improve understanding, such as scorecards, priority indicators, impact indicators, comparison visuals, benchmark examples, annotated screenshots, or expandable detail sections.

Avoid chart spam, excessive gauges, walls of text, large blocks of unexplained numbers, engineering-focused layouts, and decorative visuals without business value.
