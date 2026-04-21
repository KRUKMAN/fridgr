# Branch Protection Setup and Validation

This runbook configures and validates branch protection for `main` and `develop`.

## Prerequisites

1. GitHub repository exists.
2. Local repository has an `origin` remote.
3. You are authenticated to GitHub (Web UI or GitHub CLI).

## 1. Connect Remote (if needed)

```powershell
git remote add origin https://github.com/<OWNER>/<REPO>.git
git push -u origin main
git push -u origin develop
```

## 2. Apply Protection Rules in GitHub UI

Open:

- Repository -> Settings -> Rules -> Rulesets -> New ruleset (Branch)

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

## 3. Optional CLI Apply (if `gh` is available)

Use the repository rules payload from `github-branch-protection.json`.

```powershell
gh api repos/<OWNER>/<REPO>/rulesets --method GET
```

If no matching rulesets exist, create them with the GitHub API from the JSON file.

## 4. Validation Steps

1. Create a test branch:

```powershell
git checkout develop
git checkout -b feature/W0-branch-protection-test
```

2. Make a tiny docs change and push:

```powershell
git add README.md CONTRIBUTING.md BRANCH_PROTECTION_SETUP.md .github/workflows/ci.yml
git commit -m "docs(branching): add branch protection runbook and CI gate"
git push -u origin feature/W0-branch-protection-test
```

3. Open PR to `develop`.
4. Confirm:

- merge blocked before approval
- merge blocked before `lint-and-typecheck` succeeds

5. Direct push block test:

```powershell
git checkout main
echo "branch-protection-test" >> protection-test.txt
git add protection-test.txt
git commit -m "test: verify direct push is blocked"
git push origin main
```

Expected: push rejected due to branch protection.

## 5. Evidence Recording

Record the test PR URL in:

- `README.md` -> "Branch Protection Validation Evidence"
