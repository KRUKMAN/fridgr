# Contributing to Fridgr

## 1. Branch Model

```text
main
  └─ develop
       ├─ feature/<ticket-id>-<short-desc>
       └─ hotfix/<ticket-id>-<short-desc>
```

Branch naming conventions:

- `feature/<ticket-id>-<short-description>` (example: `feature/W0-ci-pipeline`)
- `hotfix/<ticket-id>-<short-description>` (example: `hotfix/W0-auth-token-fix`)

Branch rules:

- `main`: production-ready only. Accepts merges from `develop` (release flow) or `hotfix/*` (emergency flow).
- `develop`: integration branch. All `feature/*` branches merge here via pull request.
- `feature/*`: one branch per ticket, short-lived, PR to `develop`.
- `hotfix/*`: branch from `main`, then merge back into both `main` and `develop`.
- Wave 0 policy: no release branches.

## 2. AI Agent Workflow

- One coding agent works on exactly one `feature/*` branch per ticket.
- No coding agent pushes directly to `main` or `develop`.
- Parallel agents are allowed only when tickets do not compete on the same files or schema.

## 3. PR Process

- All changes are merged through pull requests.
- PRs require 1 approval and passing CI checks.
- Required status check context: `lint-and-typecheck`.
- PR title format: `[Wave X] <ticket-title>` (example: `[Wave 0] Setup CI pipeline`).
- PR description should reference the ticket.
- Preferred merge strategy:
- Squash merge for `feature/*` -> `develop`.
- Regular merge for `develop` -> `main` to preserve integration history.

## 4. Commit Messages

No `CONVENTIONS.md` is present, so use:

- `type(scope): description`
- Example: `feat(ci): add GitHub Actions workflow`

Allowed types:

- `feat`
- `fix`
- `docs`
- `chore`
- `refactor`
- `test`
- `ci`

## 5. Hotfix Process

- Create `hotfix/*` from `main`.
- Open PR to `main` with normal review and status-check requirements.
- After merging to `main`, open PR to merge the same hotfix into `develop`.
- Do not skip review or checks for hotfixes.

## Branch Protection Status

Branch protection must be applied to both `main` and `develop`:

- Pull request required
- At least 1 approval required
- Dismiss stale approvals on new commits
- Required status check: `lint-and-typecheck`
- Block force-push
- Block branch deletion
- `main`: require linear history
- `develop`: linear history not required

If GitHub CLI authentication is unavailable, apply rules manually using `github-branch-protection.json`.

## 6. Branch Protection Verification (Required)

Use this checklist every time repository protection is set up or changed:

1. Confirm active protection for both branches in GitHub settings:

- `main`
- `develop`

2. Confirm both branches require pull requests:

- direct pushes are blocked
- force pushes are blocked

3. Confirm PR review requirements:

- at least 1 approval required
- stale approvals dismissed after new commits

4. Confirm status check requirements:

- required check: `lint-and-typecheck`
- branch must be up to date before merge

5. Confirm merge behavior:

- `main` requires linear history (no merge commits)
- `develop` does not require linear history

6. Create a validation PR from a feature branch:

- branch example: `feature/W0-branch-protection-test`
- target: `develop`
- verify merge is blocked until:
- `lint-and-typecheck` succeeds
- at least 1 approval is submitted

Record the validation PR link in this file or in `README.md` under "Branch protection validation evidence".
