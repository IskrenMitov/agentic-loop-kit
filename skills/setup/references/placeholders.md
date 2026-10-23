# Answers file

The interview produces `.claude/agentic-loop.answers.json`; `scripts/render.mjs` turns it into the installed files.
Example: [`examples/acme-orders/answers.json`](../../../examples/acme-orders/answers.json).

**Kinds.** *required*: the renderer stops if it's missing. *default*: falls back to the default shown. *todo*: may be
skipped; the file gets a `TODO(agentic-loop)` with the template's example next to it. *silent*: may be skipped; the
line, table row or step disappears (e.g. no build command → no build in the gate).

## Switches

| Key | Values | Default | Effect |
|---|---|---|---|
| `tracker` | `none`, `notion`, `linear`, `jira`, `github`, or another tracker's name | `none` | Installs `task-intake`; `/task` accepts URLs/keys |
| `standards` | `local` \| `links` | `local` | `docs/ai/coding-standards.md` or links in AGENTS.md |
| `rules` | `markdown` \| `notion` | `markdown` | `docs/ai/team-rules.md` or the Notion database |
| `graph` | `none` \| `graphify` | `none` | Graph-first research and `graphify update` after archiving |
| `cursor` | `no` \| `yes` | `no` | `.cursor/hooks.json` and the Cursor notes in the docs |
| `hookTestPatterns` | array of regex strings | the hook's built-in list | What the hook treats as test files |

Derived, never set by hand: `lint`, `typecheck`, `build`, `e2e`, `dev` (from which commands exist), the gate lines and
lists, `TASK_INPUTS`, `TASK_ARG_HINT`, `ARCHIVE_GRAPH_STEP`, `FINISH_GRAPH_STEP`.

## Project

| Key | Kind | Meaning | Example / default |
|---|---|---|---|
| `PROJECT_NAME` | required | Repo or product name | `acme-orders` |
| `PROJECT_ONE_LINER` | required | First line of AGENTS.md: what it is, for whom, stack | `Order management API for Acme's warehouse team (Python 3.12, FastAPI, Postgres).` |
| `PROJECT_SHORT_CONTEXT` | default | A few words for the researcher's intro | the one-liner |
| `DOCS_DIR` | default | Docs root, no trailing slash | `docs` |
| `MOST_USED_DOCS` | default | 2–4 links agents need most | the AI workflow doc |

## Commands

| Key | Kind | Meaning | Example / default |
|---|---|---|---|
| `RUNTIME_VERSIONS` | required | Toolchain versions, as a sentence fragment | `Python 3.12 (.python-version), uv` |
| `CMD_INSTALL` | required | Install dependencies | `uv sync` |
| `CMD_INSTALL_WORKTREE` | default | Install in a fresh worktree, lockfile-exact | `CMD_INSTALL` |
| `CMD_TEST` | required | All tests, as CI runs them | `uv run pytest` |
| `CMD_TEST_ONE` | required | One test file | `uv run pytest tests/orders/test_refund.py` |
| `CMD_DEV`, `CMD_LINT`, `CMD_TYPECHECK`, `CMD_BUILD` | silent | Run locally, whole-repo checks | `make dev`, `ruff check .`, `mypy .`, `docker build .` |
| `CMD_E2E` | silent | End-to-end tests | `make e2e` |
| `CMD_E2E_SETUP` | silent | What must run before e2e | `docker compose up -d db` |
| `E2E_WHEN` | default | When e2e is required | `anything user-visible or an external interface` |
| `E2E_NOTES` | silent | Gotchas: ports, one run at a time, cleanup | `Only one e2e run at a time: the stack binds port 5432.` |
| `SCOPED_CHECKS_HINT` | default | How to scope checks while iterating | `run only the affected tests (\`CMD_TEST_ONE\`)` |
| `FORBIDDEN_COMMANDS` | todo | Sentence listing commands agents never run unasked | `Never run make deploy against production unless the user asks.` |

## Tests

| Key | Kind | Meaning | Example / default |
|---|---|---|---|
| `TEST_FILE_CONVENTION` | required | Test file naming, in words | `` `tests/**/test_*.py` `` |
| `EXAMPLE_TEST_PATH` | required | One real test path (hook docs) | `tests/orders/test_refund.py` |
| `TESTING_GUIDE` | default | Testing guide path | `AGENTS.md` |
| `DETERMINISM_TOOLS` | default | How tests avoid time, network and randomness | `fake clocks, fixed seeds` |
| `TYPE_ESCAPE_HATCHES` | default | What agents must not use to get green | `type-checker or linter suppressions` |
| `CONTRACT_DOC_HINT` | default | ` (path)` of the API contract | empty |

## Constraints and loop tuning

| Key | Kind | Meaning | Example / default |
|---|---|---|---|
| `HARD_CONSTRAINTS` | todo | Markdown bullets, up to ten, each **bold rule** + why | see the acme example |
| `RESEARCH_CONSTRAINT_CHECKS` | default | One line: constraints that commonly bite | `every hard constraint in AGENTS.md.` |
| `REVIEW_CONSTRAINT_CHECKS` | default | One line: what the reviewer checks | `every bullet under Hard constraints.` |
| `OPENSPEC_CONTEXT` | default | 3–6 lines of spec context | English artifacts + test-first, no network |
| `LITE_DEFINITION` | default | When a task takes the lite path | one module, no contract change, < ~100 lines |
| `MAX_REVIEW_ROUNDS` | default | Review rounds before escalating | `3` |
| `MAX_PARALLEL` | default | Parallel sub-tasks per wave | `3` |
| `SHARED_HOTSPOTS` | default | Files two parallel sub-tasks must not both change | public entry point, manifest, route table, migrations |
| `BRANCH_PREFIX` | default | Branch prefix for changes | `change/` |

## Knowledge sources

| Key | Kind | Meaning | Example / default |
|---|---|---|---|
| `TRACKER_NAME` | default | Tracker product name | from `tracker` |
| `TRACKER_FETCH_HINT` | default | MCP tool and argument to fetch one task | known per tracker |
| `TICKET_KEY_EXAMPLE` | default | Ticket key format | `ABC-123` |
| `CODING_STANDARDS_LINKS` | todo | Markdown bullets of links (`standards=links`) | `- Backend: https://wiki.example.com/backend` |
| `CODING_STANDARDS` | todo | Body of the local standards page (`standards=local`) | — |
| `RULE_ID_PREFIX` | default | Prefix for team-rule IDs | project initials |
| `RULES_DB_NAME`, `RULES_DB_URL`, `RULES_DATA_SOURCE` | required with `rules=notion` | Notion rules database | see `docs/notion-setup.md` |
| `VIEW_ORCHESTRATOR`, `VIEW_RESEARCHER`, `VIEW_SPEC_WRITER`, `VIEW_TEST_WRITER`, `VIEW_DEVELOPER`, `VIEW_REVIEWER`, `VIEW_PROPOSED` | required with `rules=notion` | One saved view URL per role | `view://…` |
