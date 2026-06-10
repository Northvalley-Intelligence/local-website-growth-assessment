# Known Limitations

## Phase 1 Local Filesystem Scan Store

Phase 1 uses a local filesystem-backed scan store so asynchronous submissions, report pages, and the admin history can share scan state during local development and automated tests.

Cloudflare staging uses a D1-backed scan store through the `ASSESSMENT_DB` binding. Production must use a separate managed store configuration and must not rely on local filesystem persistence.

This implementation can cause a Turbopack tracing warning during `next build` because the web app imports code that performs filesystem operations for local scan persistence.

This warning is acceptable for Phase 1 only when all of the following are true:

- The build passes.
- Automated tests pass.
- Runtime behavior works in local and staging environments.
- The warning is documented in `docs/operations/mde-status.md` and this known limitations file.
- Production readiness includes separately configured managed storage with retention controls.

A passing build with this warning is not a production-ready storage architecture. Production readiness requires durable, managed persistence with retention controls and deployment-compatible behavior.

## Phase 1 Cloudflare Execution Window

Cloudflare staging and production founder-testing deployments can complete typical public assessments, but full 25-page polite crawls plus PageSpeed may approach Worker execution limits. Generation 30 added a terminal execution watchdog so scans fail truthfully instead of remaining `running` forever.

As of Generation 36, Cloudflare production uses a smaller bounded assessment profile than local full-report runs. This is intentional Phase 1 behavior: larger public sites should produce truthful partial reports when enough evidence is collected, rather than failing solely because a full 25-page crawl plus PageSpeed cannot fit inside the Worker runtime budget.

This is acceptable for Phase 1 founder testing only while documented. Production readiness beyond founder testing should include a dedicated background execution model, such as a queue/consumer or another approved worker execution architecture, before claiming robust long-running scan support.
