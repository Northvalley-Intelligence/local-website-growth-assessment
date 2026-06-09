# BDD Session Playbook

Every coding session starts with:

1. Mission review.
2. Current phase goal review.
3. Fresh BDD scenarios.
4. Critical, High, and Low classification.
5. Test reuse decision.
6. New tests when needed.
7. Code until Critical and High tests pass.
8. Low failures deferred or removed when outside the phase goal.
9. Generate realistic manual QA scenarios from the current phase goal.
10. Execute those scenarios locally or through automated browser/API tests where possible.
11. Inspect the actual UI/API output.
12. Compare the output against the mission and expected user experience.
13. Identify confusing, stale, missing, or inconsistent behavior.
14. Fix Critical and High issues found during self-review.
15. Update tests so the issue does not regress.
16. Freeze implementation code after all Critical and High checks pass.
17. Generate a second fresh BDD set from the same mission and phase goal without changing implementation code.
18. Verify the second generation's Critical and High scenarios.
19. If the second generation finds a new Critical or High failure, unfreeze implementation code, fix the issue, and repeat the two-generation readiness loop.
20. Goal drift review.
21. Phase gate decision.
22. Update `docs/operations/mde-status.md` first as the founder-facing primary artifact, then update implementation details, the chronological progress log, and append-only MDE history records.

BDD scenarios should use Given/When/Then language and name the business or engineering behavior being protected.

`docs/operations/mde-status.md` is the current operational status report. `docs/operations/mdd-progress.md` is the chronological session log. `docs/operations/mde-history/` is the durable append-only history for phase, mission, BDD, test, implementation, self-QA, and readiness evolution. Update all three when a development session changes phase readiness or the mission.

## Progress Visibility Rule

MDE status reporting prioritizes progress visibility over code visibility. The founder should not need to inspect source code, test files, commit diffs, or implementation summaries to understand project status.

The primary artifact of each session is `docs/operations/mde-status.md`. Code summaries are secondary.

At the end of every development session, the top founder-facing section of `docs/operations/mde-status.md` must prominently include:

- current phase
- current phase goal
- BDD generation number
- Critical, High, and Low counts
- newly added scenarios
- reused scenarios
- newly added tests
- reused tests
- deferred tests
- blockers
- known risks
- missing founder inputs
- required credentials or access
- external dependencies not configured
- validation runs
- validation findings matched, missed, false positives, and false negatives
- self-QA results
- phase readiness assessment
- recommendation: continue phase, update mission, provide input, or move to next phase

Do not hide missing inputs or external dependencies inside report details or implementation notes. If an external dependency prevents full validation, call it out in the founder-facing status report with impact and result.

Example:

- Missing founder input: Google PageSpeed API key.
- Impact: Performance category cannot be fully validated.
- Result: Performance findings are incomplete and must say measurement was unavailable.

## Historical Tracking Rule

Prefer append-only historical records over replacing previous information. The history should make it possible to reconstruct what the system believed at each point, why changes were made, how quality improved, and how many iterations were required before readiness.

For each phase, maintain records under `docs/operations/mde-history/phase-N/` with:

- phase goal
- phase start date
- phase completion date
- number of generations
- number of mission updates
- number of phase-goal updates
- final readiness decision

For every generation record, include:

- generation number
- mission version
- phase goal version
- BDD summary and changes
- test summary
- implementation summary
- outcome and failure reasons
- self-QA results
- validation runs and validation trend observations
- founder inputs
- readiness
- two-pass verification status

Mission evolution entries should include the mission change, reason, discovery source, and impact.

## Self-QA Gate

Do not ask the founder to review after only unit tests, integration tests, type checks, or a successful build.

Before claiming a phase, feature, or bug fix is ready:

- Critical and High BDD scenarios must pass.
- Automated tests must pass.
- The system must be exercised end-to-end.
- Actual UI/API output must be inspected.
- Critical and High issues found during self-review must be fixed.
- Regression tests must be added or updated for fixed issues.
- `docs/operations/mde-status.md` must record scenarios executed, actual results observed, issues found, fixes made, and remaining risks.

Founder review is for product judgment, not basic bug discovery.

## Two-Generation Readiness Gate

A phase is not ready after one successful BDD generation.

Phase readiness requires two consecutive fresh BDD generations with no unresolved Critical or High failures and no implementation code changes between the two clean generations.

Process:

1. Generate fresh BDDs.
2. Run or verify Critical and High scenarios.
3. Fix any Critical or High failures.
4. When all Critical and High pass, freeze implementation code.
5. Generate fresh BDDs again from the same mission and phase goal.
6. If the second generation finds any new Critical or High failure, unfreeze implementation code, fix it, and repeat.
7. Phase readiness is achieved only after two consecutive clean generations.
