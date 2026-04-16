# Contributing to Fridgr

## 1. Branch Model

```text
main
  └── develop
       ├── feature/<ticket-id>-<short-desc>
       └── hotfix/<ticket-id>-<short-desc>
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
- Agents should follow `AGENTS.md` for repo constraints and `TICKET_TO_CODE.md` for the implementation workflow.

## 3. Pull Request Process

- All changes are merged through pull requests.
- PRs require 1 approval and passing CI checks.
- Required status check context: `lint-and-typecheck`.
- PR title format: `[Wave X] <ticket-title>` (example: `[Wave 0] Setup CI pipeline`).
- PR descriptions should reference the ticket and complete the PR template.
- Preferred merge strategy:
- Squash merge for `feature/*` -> `develop`
- Regular merge for `develop` -> `main` to preserve integration history

## 4. Commit Message Format

Use conventional commits:

`<type>(<scope>): <short description>`

Example:

`feat(inventory): add fridge item CRUD`

Allowed types:

- `feat` - new feature or capability
- `fix` - bug fix
- `chore` - tooling, dependency, or configuration work
- `docs` - documentation-only changes
- `test` - adding or updating tests
- `refactor` - structural changes without intended behavior change
- `style` - formatting or lint-only edits with no logic change
- `ci` - CI/CD workflow changes

Scope rules:

- Scope should match the domain or module most affected.
- Scope is required for `feat`, `fix`, `refactor`, and `test`.
- Scope is recommended, but optional, for `chore`, `docs`, `style`, and `ci`.
- If a commit spans multiple domains, split the commit when possible. If not, use the most affected domain as the scope.

Initial scopes:

- Domains: `catalog`, `inventory`, `cooking`, `diary`, `purchase`, `household`, `identity`, `serve-split`, `ai`, `sync`
- Cross-cutting: `ci`, `db`, `api`, `auth`, `config`, `docs`

Subject rules:

- Keep the subject line under 72 characters
- Use imperative mood: `add`, `fix`, `update`, not `added` or `adds`
- Do not end the subject line with a period
- Make the subject specific enough to stand alone in history

Optional body and footer:

- Use the body when the subject line is not enough to explain intent or tradeoffs
- Use footers for follow-up links or breaking-change notes
- Example footer: `Closes #123`
- Example footer: `Breaking change: rename fridge item API payload`

Examples:

- `feat(inventory): add fridge item CRUD`
- `fix(diary): correct daily summary recomputation`
- `chore(ci): validate environment variables before tests`
- `docs(conventions): add event naming rules`
- `test(catalog): add food variation mapping tests`
- `refactor(sync): extract pending mutation helper`
- `style(docs): normalize markdown headings`
- `ci: run lint before typecheck in GitHub Actions`

Security note:

- Never include secrets, access tokens, credentials, or PII in commit messages.

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
