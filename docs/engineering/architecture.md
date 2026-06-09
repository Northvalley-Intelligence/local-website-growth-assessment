# Architecture

## Packages

- `apps/web`: UI, URL submission, scan status, report viewing.
- `apps/worker`: crawling, PageSpeed adapter, extraction, scoring orchestration, report generation.
- `packages/shared`: types, validation, scoring rules, report schema.

## Boundaries

The worker owns assessment work. The web app presents and submits assessment requests. Shared deterministic rules produce scores. AI, when introduced, is an explanation layer only and must never invent evidence.

External APIs are wrapped behind adapters/interfaces.

## Operational Reliability

The Phase 1 worker records crawl decisions, skipped URLs, adapter failures, PageSpeed status, duration, page counts, and active resource limits in report metadata. The crawler is intentionally sequential in Phase 1, with `maxConcurrency` set to `1`, to protect assessed websites while the product is still small.

Fetches are wrapped with timeouts and response-size accounting. Oversized HTML is truncated before extraction, and failed pages are reported as skipped or failed instead of becoming invented evidence.

## Asynchronous Assessment Flow

URL submission creates an assessment job immediately with `pending` status. The long-running crawl and scoring work starts separately from the submit request, moves the job to `running`, and then stores either a completed report or a failed status.

The UI shows status until the job is complete. A report should only be treated as available when the job status is `completed`.

## Scoring Explainability

The scoring model is documented in `docs/engineering/scoring-model.md`. Each category score includes the category weight, factor-level evidence, formula, weighted contribution, confidence, business impact, and recommended fix.
