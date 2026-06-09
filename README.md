# Local Website Growth Assessment

North Valley Intel's Local Website Growth Assessment helps local business owners understand why their website may not be generating leads.

This repository is intentionally separate from the main North Valley Intel website. It uses a TypeScript monorepo with:

- `apps/web`: Next.js app for URL submission, scan status, and reports.
- `apps/worker`: worker package for crawling, extraction, scoring, and report generation.
- `packages/shared`: shared validation, scoring, and report types.

## Current Status

Phase 0: Foundation.

No production release is allowed until the relevant phase gates pass.

## Commands

```bash
npm install
npm run lint
npm run typecheck
npm run test
npm run test:integration
npm run build
```

## Environment

Copy `.env.example` to `.env.local` for local development. Secrets must stay in local environment files or deployment provider secret storage.

## Domains

- Staging: `staging-assessment.northvalleyintel.com`
- Production: `assessment.northvalleyintel.com`
