# Deployment

Hosting target: Cloudflare Workers through OpenNext for dynamic Next.js routes.

Staging deploy target: `staging-assessment.northvalleyintel.com`

Production deploy target: `assessment.northvalleyintel.com`

Production deploy is allowed only when:

- Critical tests pass.
- High tests pass.
- Staging deploy succeeds.

Environment variables are configured in deployment provider secret storage. Local development uses `.env.local` copied from `.env.example`.

## Phase 1 Staging Readiness

The Phase 1 application can be deployed to staging once CI passes. The initial vertical slice uses the web app to invoke the worker package directly, with external APIs behind adapters and `PAGESPEED_API_KEY` optional.

Cloudflare staging commands:

- Build Cloudflare Worker: `npm run cf:build`
- Deploy staging Worker: `npm run cf:deploy:staging`

The staging Worker is configured in `apps/web/wrangler.jsonc` with the route `staging-assessment.northvalleyintel.com/*`.

Staging deployment status as of 2026-06-09:

- Cloudflare Worker deployed: `northvalley-assessment-staging`
- Worker route deployed: `staging-assessment.northvalleyintel.com/*`
- Worker storage binding configured: `ASSESSMENT_DB` backed by Cloudflare D1 database `northvalley-assessment-staging`
- Worker secret configured: `PAGESPEED_API_KEY`
- Runtime validation passed for submit, status, history, insufficient-evidence handling, and completed-report handling.
- Latest validated staging Worker version: `2bf3d06a-a857-4423-a340-b88a07455484`.

Before staging:

- Configure `PAGESPEED_API_KEY` only if PageSpeed results should be included.
- Confirm the Cloudflare zone for `northvalleyintel.com` can route `staging-assessment.northvalleyintel.com` to the Worker.
- Run CI commands: lint, typecheck, unit tests, integration tests, and build.
- Do not deploy production until Critical and High tests pass and staging succeeds.

## Phase 1 Storage Warning

The Phase 1 vertical slice uses a local filesystem-backed scan store for local development and automated tests. Cloudflare staging uses a D1-backed store through the `ASSESSMENT_DB` binding. `next build` can pass while emitting a Turbopack tracing warning because the local store still uses filesystem operations.

This warning is acceptable for Phase 1 local/staging validation only when build, tests, and runtime behavior pass and the warning remains documented in MDE status and known limitations.

Do not treat a passing build with this warning as production-ready. Production readiness requires a separately configured production persistent store and production runtime validation.

## Production Blocker

Production deployment is not currently allowed even with founder approval because Generation 30 changed implementation code after staging self-QA failures. The Phase 1 gate requires a second clean fresh BDD generation with no code changes before production can proceed.

Before production deployment to `assessment.northvalleyintel.com`:

- Create and bind a separate production D1 database or another approved managed store.
- Configure production `PAGESPEED_API_KEY`.
- Attach and validate the production route/DNS.
- Run production self-QA for submit, status, history, insufficient-evidence, completed report, and report output.
- Keep longer-running production scan execution under review; Cloudflare Worker request lifetime can constrain 25-page polite crawls plus PageSpeed, so a dedicated background execution model remains a production-readiness risk.
