# Phases

## Phase 0: Foundation

Create the professional repository foundation before product features.

Exit gate:

- CI runs lint, typecheck, tests, and build.
- Docs exist.
- Environment strategy documented.
- Repo is clean and professional.

## Phase 1: Complete Vertical Slice

Build the first usable flow: URL input to safe public crawl to signal extraction to scoring to report page.

Phase 1 must respect robots.txt, same-domain boundaries, max 25 pages, max depth 2, polite crawl delay, and no form submission or authentication bypass.

## Phase 2: Report Distribution

Add branded PDF export, shareable report URL, consultation CTA, and production deployment when gates pass.

The first PDF should include a one-page teaser version generated from the assessment report. It must clearly state that it is not the final report and direct readers to `contact@northvalleyintel.com` for the complete report and fixing strategy.

Phase 2 or any production-readiness effort must replace the Phase 1 filesystem-backed local scan store with a proper persistent store before production can be considered ready.

## Phase 3: Private Analytics Connectors

Add Google Search Console and GA4 connectors with secure OAuth. Do not make unsupported claims about bot traffic.

## Phase 4: Benchmark Library

Add curated distant-market benchmark patterns with no local competitor comparisons.
