# Validation Reference Tools

These tools are development-time validation references for North Valley Intel's internal MDE process. They are not customer-facing product features, and they are not production product dependencies unless explicitly listed under Production Dependencies.

## Production Dependencies

Current planned production assessment dependency:

- Google PageSpeed Insights API

The production platform must remain self-contained for crawling, extraction, scoring, report generation, and explainability. Do not add production dependencies on Screaming Frog, HubSpot Website Grader, Semrush, Ahrefs, GTmetrix, or similar third-party assessment tools without a future explicit phase decision.

## Validation References

Validation references may be used during development to compare findings, identify false positives and false negatives, and improve report quality. Their findings do not automatically override our assessment. Differences should be investigated and documented.

## Lighthouse

Source:

- Chrome for Developers: [Introduction to Lighthouse](https://developer.chrome.com/docs/lighthouse/overview/)
- GitHub: [GoogleChrome/lighthouse](https://github.com/GoogleChrome/lighthouse)

What it validates well:

- Single-page performance lab metrics.
- Accessibility checks.
- Best-practice checks.
- Basic SEO checks.
- Progressive web app checks where relevant.
- Clear audit references that explain why a finding matters and how to fix it.

What it does not validate:

- Whole-site crawl coverage.
- Local business lead-generation quality.
- Whether the service area, customer type, trust proof, or contact path is persuasive.
- Whether recommendations are prioritized for a small business owner.
- Whether local business signals are complete across multiple pages.
- Whether a report would make sense to a non-technical owner.

Open source:

- Yes. Lighthouse is open source.

Free or paid:

- Free.

API key required:

- No API key is required to run Lighthouse locally through Chrome DevTools, CLI, or Node.

Suitable as a validation reference:

- Yes, for performance, accessibility, basic SEO, best practices, and report-explanation quality.
- Not authoritative for lead conversion, trust signals, message clarity, local visibility, AI discoverability, or business prioritization.

Known limitations:

- Results can vary by runtime, network throttling, CPU, device profile, and page state.
- It is page-oriented, not a complete site crawler.
- High Lighthouse scores do not prove a website generates local leads.
- Some audits are technical and need translation before they are useful to a small business owner.

## Google PageSpeed Insights

Source:

- Google for Developers: [Get Started with the PageSpeed Insights API](https://developers.google.com/speed/docs/insights/v5/get-started)
- Google for Developers: [PageSpeed Insights API runpagespeed method](https://developers.google.com/speed/docs/insights/rest/v5/pagespeedapi/runpagespeed)

What it validates well:

- Page-level performance using Lighthouse lab data.
- PageSpeed API response handling.
- Mobile and desktop analysis strategies.
- Performance, accessibility, best-practices, and SEO categories available through Lighthouse data.
- Whether our Performance score correctly reflects measured PageSpeed evidence.

What it does not validate:

- Whole-site crawl coverage.
- Broken links across a crawled site.
- Local lead-generation signals outside technical page checks.
- Trust, message clarity, business differentiation, or local customer fit.
- Whether our report prioritization is appropriate.

Open source:

- The PageSpeed Insights service is not open source. It returns Lighthouse data, and Lighthouse is open source.

Free or paid:

- The API is available from Google. Quotas and Google Cloud project policies apply.

API key required:

- The API can be tried without code through Google's explorer, and Google documents API key usage for automated requests. For this product, a `PAGESPEED_API_KEY` is required for reliable automated validation and production Performance scoring.

Suitable as a validation reference:

- Yes, and it is the only planned external assessment dependency in the production product.
- Authoritative for our Performance validation when configured.

Known limitations:

- API calls can be slow or fail.
- Scores can vary between runs.
- Results are page-level, not site-wide.
- Field data availability depends on Chrome UX Report coverage and may be absent for smaller sites.
- Google has indicated changes to real-world CrUX data availability in the PageSpeed Insights API, so field-data assumptions should be reviewed periodically.

## Screaming Frog SEO Spider

Source:

- Screaming Frog: [SEO Spider Pricing](https://www.screamingfrog.co.uk/seo-spider/pricing/?wmc-currency=USD)
- Screaming Frog: [SEO Spider](https://www.screamingfrog.co.uk/seo-spider/)

What it validates well:

- Crawl coverage.
- Internal URL discovery.
- Broken links.
- Redirects, redirect chains, and status codes.
- Page titles and meta descriptions.
- Canonicals, robots directives, and technical SEO data.
- Manual export comparison for crawl findings.

What it does not validate:

- Whether a small business report is understandable.
- Whether findings are prioritized for lead generation.
- Whether trust, clarity, local fit, or calls to action are persuasive.
- Whether a missing signal matters in business language.
- Whether our score formulas are reproducible.

Open source:

- No.

Free or paid:

- Free version available with a 500 URL crawl limit.
- Paid license required for more than 500 URLs and advanced features.

API key required:

- No API key is required for basic desktop crawling.
- Some optional integrations, such as PageSpeed Insights or analytics integrations, require separate credentials.

Suitable as a validation reference:

- Yes, for development-time crawl correctness, broken links, redirects, metadata, and robots/crawl comparison.
- Not suitable as a production dependency.

Known limitations:

- Desktop tool; validation may require manual setup and exports.
- Can be configured in ways that differ from our crawler policy.
- May crawl more aggressively or deeply than our Phase 1 limits.
- Paid features may not be available in the free version.
- It is an SEO crawler, not a local lead-generation assessment system.

## HubSpot Website Grader

Source:

- HubSpot: [Website Tests](https://www.hubspot.com/tests)
- HubSpot Blog: [Does Your Website Make The Grade?](https://blog.hubspot.com/marketing/does-your-website-make-the-grade)

What it validates well:

- Simple owner-friendly website health presentation.
- Basic categories such as performance, mobile usability, SEO-friendliness, and security.
- Plain-language grading and prioritization examples.
- Report readability and customer-facing framing.

What it does not validate:

- Our crawl coverage.
- Detailed broken link comparison.
- Our exact local visibility, lead conversion, trust, clarity, or AI discoverability factors.
- Factor-level evidence traceability.
- Whether a finding is true across multiple crawled pages.
- Our deterministic scoring model.

Open source:

- No.

Free or paid:

- Free public tool.

API key required:

- No public API key is documented for manual use of the public grader.

Suitable as a validation reference:

- Yes, for report-quality comparison, plain-language explanations, grade framing, and owner-friendly presentation.
- Not suitable as a production dependency or authoritative technical source for our scoring.

Known limitations:

- Proprietary scoring.
- Public output and behavior can change.
- It emphasizes broad website health, not local lead-generation diagnosis.
- It does not provide enough transparent factor-level evidence to replace our own scoring explanations.
