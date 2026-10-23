# Team rules

Durable rules for the coding agents, written by the `feedback-curator` (via `/feedback`) and approved by a human.
Agents read only the rows whose `Applies to` names their role or `all agents`, with `Status` = `Active`.

- **Severity**: `Must` (reviewer blocks), `Should` (reviewer flags), `Prefer` (style, never blocks).
- **Status**: `Active`, `Proposed` (inferred by the curator; a human sets it to `Active` or deletes it), `Superseded`.
- A rule that is also written into `AGENTS.md`, an agent or a skill names that file in `Enforced in`; agents that
  already loaded the file skip the row.

| ID | Rule | Guidance | Severity | Status | Applies to | Scope | Keywords | Source quote | Enforced in |
|---|---|---|---|---|---|---|---|---|---|
| {{RULE_ID_PREFIX}}-1 | Example: Use the shared `Money` type for amounts | Never use binary floats for currency: rounding drifts across sums. Use the shared `Money` type. | Must | Proposed | developer, reviewer | {{PROJECT_NAME}} | money, currency, float | "stop using floats for prices" | — |

_The first row is an example: delete it once you add your first real rule._
