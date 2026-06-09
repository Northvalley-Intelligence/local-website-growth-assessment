# Mission Updates

This file is the human-readable mission change log. Keep it brief. Store detailed generation history under `.mde/` and `docs/operations/mde-history/`.

## 2026-06-09

- Split MDE artifacts into human, agent, and deploy lanes.
- Human-facing mission/status should stay concise and founder-readable.
- Agent-facing state should live in `.mde/` as structured JSON/JSONL.
- Deploy facts should live in `deploy/` and be optimized for reproducibility.

## Phase 1 Refinements Already Incorporated

- Assessments are asynchronous and produce truthful statuses: `pending`, `running`, `completed`, `failed`, or `insufficient_evidence`.
- Reports require sufficient evidence before confident scoring.
- Reports should establish trust by showing what was found before recommendations.
- Negative findings require concrete supporting evidence.
- Scores must explain found evidence, missing evidence, factor contribution, business impact, and recommended action.
- MDE phase readiness requires two consecutive clean BDD generations with no code changes between them.
- Self-QA is required before founder review.
