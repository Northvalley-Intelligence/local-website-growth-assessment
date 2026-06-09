# Security And Data Handling

Store only:

- Scan URL.
- Domain.
- Crawl metadata.
- Extracted public signals.
- Scores.
- Report output.

Do not store unnecessary raw HTML. Do not store secrets. Do not log sensitive data. Redact secrets from logs.

Crawler user agent: `NorthValleyIntelWebsiteAssessmentBot/0.1`

The crawler must respect robots.txt, same-domain boundaries, rate limits, authentication boundaries, and paywalls.

Resource protection defaults:

- Max pages: 25.
- Max depth: 2.
- Request timeout: 10 seconds.
- Max response text processed: 750,000 bytes.
- Crawl concurrency: 1 request at a time.
- Local in-memory scan history: 50 reports.

Disallowed activity:

- Port scanning.
- SQL injection testing.
- XSS testing.
- Login testing.
- Vulnerability scanning.
- Form submission.
- Private/admin crawling.

Disclaimer:

"This is an automated public website assessment, not a legal, SEO, accessibility, or security compliance certification."
