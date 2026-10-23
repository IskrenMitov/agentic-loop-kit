# AGENTS.md

Order management API for Acme's warehouse team (Python 3.12, FastAPI, Postgres). Fictional example of a filled-in kit.

## Hard constraints

- **Target runtime is Python 3.12.** No syntax or stdlib APIs from 3.13+; CI runs 3.12 only.
- **The `/v1` API is frozen.** Never change a response shape under `/v1`; add the field to `/v2` instead. The
  contract is `docs/api/contract.md`.
- **Money is `Decimal` via `app/shared/money.py`**, never `float`.
- **No PII in logs.** Wrap anything user-provided in `redact()` from `app/logging.py`.
- **Migrations are additive.** Never drop or rename a column in the same release that stops using it.
- **Customer-facing strings are in German; code, comments and docs in English.**
- Tests never hit the network. Use `tests/fakes/` or the `docker compose` test stack.

## Commands

Python 3.12 (`.python-version`), uv. Run from the repo root.

| Command | Use |
| --- | --- |
| `uv sync` | Install |
| `make dev` | Run locally |
| `uv run pytest tests/orders/test_refund.py` | Run one test file |
| `uv run ruff check .` | Lint |
| `uv run mypy .` | Typecheck |
| `uv run pytest` | All tests |
| `docker build .` | Production build |
| `make e2e` | End-to-end tests |

Never run `make deploy` or `alembic upgrade` against a shared database unless the user asks.

## Definition of done

1. `uv run ruff check .`, `uv run mypy .`, `uv run pytest` and `docker build .` pass.
1. `make e2e` passes when the change affects the HTTP API, auth or database migrations.
1. New behavior is covered by tests (`tests/**/test_*.py`, mirroring `app/`).
1. Docs in `docs/` and specs in `openspec/specs/` match the change.

## How to work here

- **Feature work goes through `/task`** (Linear URL or key, or a description). It runs research, an OpenSpec proposal
  you approve, then tests first, implementation and review. See `docs/ai/workflow.md`.
- Small fixes can use `/task` too; it picks the lite path automatically.
- **General feedback** from the user (a preference or rule beyond the current task): run the `feedback-curator`
  agent so it lands in the team rules and, if it is a repo rule, in this file or a skill.
- Never edit test files written by the `test-writer` agent while implementing; escalate instead.

## External references

- Coding standards: [`docs/ai/coding-standards.md`](docs/ai/coding-standards.md)
- Team rules: [`docs/ai/team-rules.md`](docs/ai/team-rules.md). Before starting, read the rows whose
  `Applies to` names your role (or `all agents`) and whose `Status` is `Active`; apply `Rule` + `Guidance` +
  `Severity` only. If your launch prompt already has `Team rules:`, use those instead.

## Docs

Start at [`docs/README.md`](docs/README.md). Most used: [API contract](docs/api/contract.md), [testing guide](docs/guides/testing.md).
