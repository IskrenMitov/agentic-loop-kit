# AGENTS.md

{{PROJECT_ONE_LINER}}
<!-- Example: "Order management API for Acme's warehouse team (Python 3.12, FastAPI, Postgres)." Keep it to one or two lines. -->

## Hard constraints

<!--
Only rules an agent can't discover by reading the code, and that break something when ignored.
Up to ten bullets. Examples (replace with yours):
- **Target runtime is Python 3.12.** No syntax or stdlib APIs from 3.13+; CI runs 3.12 only.
- **Public API is versioned.** Never change a response shape under `/v1`; add `/v2` instead.
- **No PII in logs.** Use `redact()` from `app/logging.py` for anything user-provided.
- **Every long-lived resource is closed** (connections, subscriptions, timers) in the owner's shutdown hook.
- **User-facing text is in German; code, comments and docs in English.**
- Tests never hit the network. Use the fakes in `tests/fakes/` or the local mock server.
-->
{{HARD_CONSTRAINTS}}

## Commands

{{RUNTIME_VERSIONS}}. Run from the repo root.

| Command | Use |
| --- | --- |
| `{{CMD_INSTALL}}` | Install |
<!-- @if dev=yes -->
| `{{CMD_DEV}}` | Run locally |
<!-- @endif -->
| `{{CMD_TEST_ONE}}` | Run one test file |
<!-- @if lint=yes -->
| `{{CMD_LINT}}` | Lint |
<!-- @endif -->
<!-- @if typecheck=yes -->
| `{{CMD_TYPECHECK}}` | Typecheck |
<!-- @endif -->
| `{{CMD_TEST}}` | All tests |
<!-- @if build=yes -->
| `{{CMD_BUILD}}` | Production build |
<!-- @endif -->
<!-- @if e2e=yes -->
| `{{CMD_E2E}}` | End-to-end tests |
<!-- @endif -->

{{FORBIDDEN_COMMANDS}}
<!-- Example: "Never run `make deploy`, `terraform apply` or anything against production unless the user asks." -->

## Definition of done

1. {{GATE_LIST}}.
<!-- @if e2e=yes -->
1. `{{CMD_E2E}}` passes when the change affects {{E2E_WHEN}}.
<!-- @endif -->
1. New behavior is covered by tests ({{TEST_FILE_CONVENTION}}).
1. Docs in `{{DOCS_DIR}}/` and specs in `openspec/specs/` match the change.

## How to work here

<!-- @if graph=graphify -->
- **Codebase questions: query the graph first.** `graphify query "<question>"` (graph in `graphify-out/`) before
  broad grep/glob. After structural changes run `graphify update .`.
<!-- @endif -->
- **Feature work goes through `/task`** ({{TASK_INPUTS}}). It runs research, an OpenSpec proposal
  you approve, then tests first, implementation and review. See `{{DOCS_DIR}}/ai/workflow.md`.
- Small fixes can use `/task` too; it picks the lite path automatically.
- **General feedback** from the user (a preference or rule beyond the current task): run the `feedback-curator`
  agent so it lands in the team rules and, if it is a repo rule, in this file or a skill.
- Never edit test files written by the `test-writer` agent while implementing; escalate instead.

## External references

<!-- @if standards=links -->
{{CODING_STANDARDS_LINKS}}
<!-- Example:
- Backend coding standards: https://wiki.example.com/eng/backend-standards
- Frontend coding standards: https://wiki.example.com/eng/frontend-standards
-->
<!-- @endif -->
<!-- @if standards=local -->
- Coding standards: [`{{DOCS_DIR}}/ai/coding-standards.md`]({{DOCS_DIR}}/ai/coding-standards.md)
<!-- @endif -->
<!-- @if rules=markdown -->
- Team rules: [`{{DOCS_DIR}}/ai/team-rules.md`]({{DOCS_DIR}}/ai/team-rules.md). Before starting, read the rows whose
  `Applies to` names your role (or `all agents`) and whose `Status` is `Active`; apply `Rule` + `Guidance` +
  `Severity` only. If your launch prompt already has `Team rules:`, use those instead.
<!-- @endif -->
<!-- @if rules=notion -->
- Team rules (Notion database "{{RULES_DB_NAME}}"): {{RULES_DB_URL}}
  - Data source: `{{RULES_DATA_SOURCE}}`
  - Before starting, read the active rules for your role **through its view** (never query the whole database):
    `notion-query-data-sources` with `{"mode": "view", "view_url": "<view>"}`, and apply `Rule` + `Guidance` +
    `Severity` only. Skip rows whose `Enforced in` names a file you already loaded. If your launch prompt already
    has `Team rules:`, use those and don't query.

    | Role | View |
    |---|---|
    | orchestrator | `{{VIEW_ORCHESTRATOR}}` |
    | researcher | `{{VIEW_RESEARCHER}}` |
    | spec-writer | `{{VIEW_SPEC_WRITER}}` |
    | test-writer | `{{VIEW_TEST_WRITER}}` |
    | developer | `{{VIEW_DEVELOPER}}` |
    | reviewer | `{{VIEW_REVIEWER}}` |
    | humans (proposed rules) | `{{VIEW_PROPOSED}}` |
<!-- @endif -->

## Docs

Start at [`{{DOCS_DIR}}/README.md`]({{DOCS_DIR}}/README.md). Most used: {{MOST_USED_DOCS}}.
<!-- Example: [API contract](docs/api/contract.md), [development guide](docs/guides/development.md). -->
