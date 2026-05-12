# Notion Workspace — Fridgr

Notion is the source of truth for project management, contracts, and delivery
process. The Notion MCP is connected — agents can fetch any page below
directly using the page ID or URL. Do not copy contract content into this
repo; fetch it live so it is always current.

## When to use Notion vs. the repo

| Need                                                       | Source                                                             |
| ---------------------------------------------------------- | ------------------------------------------------------------------ |
| Current task, sprint, or wave status                       | Notion — Fridgr Tasks                                              |
| Endpoint field names, error codes, request/response shapes | Notion — API Contracts v1                                          |
| Data model field contracts, domain boundaries              | Notion — Implementation Contracts v1                               |
| Domain event payloads and state transitions                | Notion — Event & State Machine Contracts v1                        |
| How to structure a ticket for an agent                     | Notion — Delivery System / AI Process                              |
| How Fridgr proves work is correct                          | Notion — Testing, QA & Release System                              |
| Architecture, coding rules, naming, security               | Repo — `CLAUDE.md`, `CONVENTIONS.md`                               |
| Commit and PR format                                       | Repo — `docs/COMMIT_FORMAT.md`, `.github/PULL_REQUEST_TEMPLATE.md` |

## Key pages

| Page                                     | URL                                                    | Purpose                                                                          |
| ---------------------------------------- | ------------------------------------------------------ | -------------------------------------------------------------------------------- |
| Fridgr Tasks                             | https://www.notion.so/2724b13b18af4de3966e454e45820d7a | Live kanban board — current sprint, backlog, wave breakdown                      |
| API Contracts v1                         | https://www.notion.so/bb7d90c79c7a46c08c214eb7d238fced | Edge Function endpoint specs — required reading before implementing any endpoint |
| Implementation Contracts v1              | https://www.notion.so/a1e617aad4224b3ba34ba3af9b133989 | Data models, field-level contracts, domain boundary rules                        |
| Event & State Machine Contracts v1       | https://www.notion.so/d11b2fec9f8a46ec901a0d13cd22d046 | Domain event payloads and state machine transitions                              |
| Delivery System — Kanban Operating Model | https://www.notion.so/409f33a3f311470fb4a4dd796336c3cf | How work is structured and turned into agent-ready tickets                       |
| AI Process for Task Creation             | https://www.notion.so/34302e8fbc258051b86af8c7b2e1b8d5 | Quick-start reference for building Fridgr with AI agents                         |
| Testing, QA & Release System             | https://www.notion.so/acc75e772ca84b4a9093fb26b6700d56 | Definition of done, QA gates, release process                                    |
| Documentation Map                        | https://www.notion.so/050c6cfab3eb42e0bd49824798788c3e | Canonical sources, archive rules, what lives where                               |
| Visual Direction                         | https://www.notion.so/832039646f6748eea47a0454481be565 | Electric Soft Kitchen design system and UI direction                             |

## Rules

- Never implement an endpoint, event, or data model without first reading
  the relevant contract page in Notion.
- If a ticket and a contract conflict, stop and escalate — do not invent a
  resolution.
- If a contract page does not exist for the work, stop and escalate.
