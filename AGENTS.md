# Agent Instructions

## Mission-Driven Engineering

Every implementation session must follow the Mission-Driven Engineering process documented in `docs/operations/bdd-session-playbook.md` and update `docs/operations/mde-status.md` before the session is considered complete.

## Branch And Deployment Policy

Staging and production must stay tied to GitHub branches:

- `staging` is the source of truth for `staging-assessment.northvalleyintel.com`.
- `main` is the source of truth for `assessment.northvalleyintel.com`.
- Staging deploys must come from the `staging` branch.
- Production deploys must come from the `main` branch.
- Do not deploy staging or production from an uncommitted local working tree.
- Do not deploy production from `staging`, feature branches, detached HEAD, or unpushed commits.
- If an emergency manual deploy is unavoidable, record it immediately in `docs/operations/mde-status.md`, including branch, commit SHA, reason, validation performed, and whether the deployed artifact differs from the branch tip.

Before claiming an environment is current:

- Confirm the local branch matches the intended environment branch.
- Confirm the deployment commit has been pushed to GitHub.
- Confirm automated gates pass.
- Confirm environment-specific self-QA passes.
- Update MDE telemetry with the branch, commit SHA, deployment target, and validation result.

## Production Gate

Production may be deployed only when:

- Critical and High BDD scenarios pass.
- Automated gates pass: format, lint, typecheck, unit tests, integration tests, build, and Cloudflare build.
- Staging is already passing from the `staging` branch.
- Production storage, secrets, route/DNS, and self-QA are configured and validated.
- The production deploy is from `main`.
