# Commit Format

Fridgr uses Conventional Commits for all human and agent commits.
For repo-wide naming and file conventions, see
[../CONVENTIONS.md](../CONVENTIONS.md).

## Format

```text
<type>(<scope>): <short description>

[optional body]

[optional footer]
```

## Types

- `feat`: new feature or capability
- `fix`: bug fix
- `chore`: maintenance, dependencies, or config
- `docs`: documentation only
- `test`: adding or updating tests
- `refactor`: code change that neither fixes nor adds a feature
- `style`: formatting or whitespace with no logic change
- `ci`: CI or CD configuration changes
- `perf`: performance improvement

## Scope

Use the module or domain name in lowercase when it helps clarify the
change. Common scopes include:

- `inventory`
- `diary`
- `cooking`
- `catalog`
- `household`
- `identity`
- `auth`
- `sync`
- `ai`
- `serve-split`
- `purchase`
- `ci`
- `config`
- `deps`
- `db`

## Examples

```text
feat(inventory): add fridge item CRUD endpoint
fix(diary): correct macro calculation rounding
chore(deps): upgrade expo-sqlite to 15.x
docs(agents): update AGENTS.md with Drizzle patterns
test(cooking): add dish batch creation unit tests
ci(actions): add typecheck step to CI pipeline
refactor(sync): extract pending_mutations queue logic
```

## Rules

- Keep the subject line at 72 characters or fewer.
- Use imperative mood such as `add`, not `added` or `adds`.
- Do not end the subject line with a period.
- Wrap the body at 80 characters.
- Reference the ticket ID in the footer, for example
  `Ticket: FRIDGR-123`.
- For breaking changes, add a `BREAKING CHANGE:` footer.

## Agent Rule

Every Codex commit must follow this format. If you are unsure about the
scope, use the closest domain name. If the change is truly cross-cutting,
you may omit the scope:

```text
chore: update .gitignore entries
```
