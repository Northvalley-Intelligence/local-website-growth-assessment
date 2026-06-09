# Local Website Growth Assessment

Production URL: `assessment.northvalleyintel.com`
Staging URL: `staging-assessment.northvalleyintel.com`

## Mission

Help local business owners understand why their website may not be generating leads by safely analyzing publicly accessible website information and generating plain-English, business-friendly recommendations.

This is not a generic SEO tool. This is not a security scanner. This is not a technical website grader.

The product answers: "Why is my website not generating more local customers?"

## Current Phase

Phase 1: Complete Vertical Slice

Goal: Build the first usable version: URL input to safe public crawl to signal extraction to scoring to report page.

## MDD Session Rules

At the start of every coding session:

1. Read the mission.
2. Read the current phase goal.
3. Generate fresh BDD scenarios.
4. Mark each as Critical, High, or Low.
5. Reuse existing tests where valid.
6. Add new tests where needed.
7. Implement until all Critical and High tests pass.
8. Defer or remove Low failures if they do not support the phase goal.
9. Run goal drift review.
10. Stop at phase gate if no Critical or High failures remain.

Do not move phases automatically unless the phase gate is satisfied.

## Phase 1 Exit Gate

- Critical tests pass.
- High tests pass.
- Staging deployment readiness is documented.
- Production deployment does not occur without explicit approval.
