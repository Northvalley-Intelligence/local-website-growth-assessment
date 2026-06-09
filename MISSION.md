# Mission

Build the Local Website Growth Assessment for North Valley Intel.

The product helps local business owners understand why their website may not be generating more local customers by safely analyzing publicly accessible website information and producing plain-English, business-friendly recommendations.

This is not a generic SEO tool, a security scanner, or a technical website grader.

The product answers:

> Why is my website not generating more local customers?

## Current Phase

Phase 1: Complete Vertical Slice.

## Current Status

Phase 1 is deployed to staging and production for founder testing.

- Staging: `https://staging-assessment.northvalleyintel.com`
- Production: `https://assessment.northvalleyintel.com`
- Staging branch: `staging`
- Production branch: `main`

## What Matters Most

- Assessments must be safe, asynchronous, and resource-conscious.
- Reports must be evidence-backed, business-readable, and decision-oriented.
- Scores must be explainable and reproducible.
- Low-evidence assessments must not produce confident customer-facing reports.
- Founder review should be used for product judgment, not basic bug discovery.

## Current Risks

- PageSpeed can be unavailable in Cloudflare Worker runtime; the report must say so honestly and avoid inventing a Performance score.
- Dedicated background execution is still needed for stronger production reliability.
- Authenticated API access, scheduled scans, PDF/shareable reports, and consultation CTA are Phase 2+ work.
- A mistaken personal GitHub repository was created earlier and should only be deleted with explicit founder approval.

## Next

Use Phase 2 for report sharing/export, consultation CTA, API hardening, scheduled scan access patterns, and production reliability hardening.
