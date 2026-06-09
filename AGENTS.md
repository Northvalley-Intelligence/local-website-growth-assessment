# Agent Instructions

## Mission-Driven Engineering

Every implementation session must follow the Mission-Driven Engineering process documented in `docs/operations/bdd-session-playbook.md`.

At session start, read the artifacts in this order:

1. `MISSION.md`
2. `MISSION_UPDATES.md`
3. `.mde/state.json`
4. `.mde/failing-bdds.json`
5. `deploy/release-checks.json` when deployment is involved

At session end, update the correct artifact lane:

- Human artifacts: concise founder-readable files such as `MISSION.md`, `MISSION_UPDATES.md`, and `docs/operations/mde-status.md`.
- Agent artifacts: structured machine-readable state under `.mde/`.
- Deploy artifacts: release and environment metadata under `deploy/`.

Do not turn human status files into long implementation logs. Keep detailed traceability in `.mde/` and append-only history files.

Update `docs/operations/mde-status.md` before the session is considered complete, but keep it optimized for founder understanding.

## Artifact Lanes

### Human Artifacts

Human artifacts are optimized for human understanding.

Humans should quickly understand:

- what is being built
- what changed
- what remains risky
- what happens next

Avoid large code dumps, noisy trace logs, and low-level implementation detail in human artifacts.

### Agent Artifacts

Agent artifacts exist to help agents reason efficiently.

Use `.mde/` for retrieval, traceability, validation, planning, and decision making. Prefer JSON or JSONL where possible:

- `.mde/state.json`
- `.mde/bdd-index.json`
- `.mde/failing-bdds.json`
- `.mde/task-graph.json`
- `.mde/risk-register.json`
- `.mde/decisions.jsonl`
- `.mde/progress.json`
- `.mde/generations/`

Agent artifacts do not need to be polished for humans. They should be fast to read and update.

### Deploy Artifacts

Deploy artifacts optimize reliability, reproducibility, simplicity, and operational cost.

Use `deploy/` for release metadata:

- `deploy/build-manifest.json`
- `deploy/release-checks.json`
- `deploy/environment.schema.json`

Deployment should not require extensive human interpretation.

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
