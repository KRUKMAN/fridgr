# Branch Protection Setup and Validation

This runbook configures and validates branch protection for `main` and `develop`.

## Prerequisites

1. GitHub repository exists.
2. Local repository has an `origin` remote.
3. You are authenticated to GitHub (Web UI or GitHub CLI).

## 1. Connect remote (if needed)

```bash
git remote add origin https://github.com/<OWNER>/<REPO>.git
git push -u origin main
git push -u origin develop
```

## 2. Apply protection rules in GitHub UI

Open: **Repository → Settings → Rules → Rulesets → New ruleset (Branch)**

Create two rulesets:

1. `main-protection` targeting `main`
2. `develop-protection` targeting `develop`

Enable for both:

- Require a pull request before merging
- Required approvals: `1`
- Dismiss stale approvals
- Require status checks to pass
- Required check: `lint-and-typecheck`
- Require branches to be up to date before merging
- Block force pushes
- Block branch deletion

Additional for `main` only:

- Require linear history

## 3. Optional CLI apply (if `gh` is available)

Use the repository rules payload from `github-branch-protection.json`.

```bash
gh api repos/<OWNER>/<REPO>/rulesets --method GET
```

If no matching rulesets exist, create them with the GitHub API from the JSON file.

## 4. Validation steps

1. Create a test branch:

```bash
git checkout develop
git checkout -b feature/W0-branch-protection-test
```

2. Make a tiny docs change and push:

```bash
git add README.md CONTRIBUTING.md .github/workflows/ci.yml
git commit -m "docs(branching): add branch protection runbook and CI gate"
git push -u origin feature/W0-branch-protection-test
```

3. Open PR to `develop`.
4. Confirm:
   - Merge blocked before approval
   - Merge blocked before `lint-and-typecheck` succeeds

5. Direct push block test:

```bash
echo "branch-protection-test" >> protection-test.txt
git add protection-test.txt
git commit -m "test: verify direct push is blocked"
git push origin main
```

Expected: push rejected due to branch protection.

## 5. Evidence recording

Record the test PR URL in `CONTRIBUTING.md` under "Branch Protection Status".
