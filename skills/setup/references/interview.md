# Interview

Four rounds. In each, show what you detected as the default (`detected: …`) and ask only for what's missing or
needs a decision. Accept "skip" for anything that isn't *required* in `placeholders.md`. The arrows name the
answers-file keys each question fills.

## Round 1: project and tools

1. Project name and a one-line description (stack included). → `PROJECT_NAME`, `PROJECT_ONE_LINER`,
   `PROJECT_SHORT_CONTEXT`
2. Which agent tools does the team use? Claude Code, Cursor, both, other (Codex, Copilot…: they read `AGENTS.md`
   only). → `cursor`, and the OpenSpec `--tools`
3. Where do docs live? (detected: `docs/`) → `DOCS_DIR`
4. Language rules: what language are code, comments, docs and specs written in, and the user-facing text?
   → goes into Hard constraints and `OPENSPEC_CONTEXT`

## Round 2: commands and tests

Show the table you detected from manifests and CI and ask the user to correct it:

| Purpose | Detected |
|---|---|
| Install (+ offline/frozen variant for worktrees) | `CMD_INSTALL`, `CMD_INSTALL_WORKTREE` |
| Run locally | `CMD_DEV` |
| Lint / typecheck / test / build (leave out what the repo doesn't have) | `CMD_LINT`, `CMD_TYPECHECK`, `CMD_TEST`, `CMD_BUILD` |
| One test file | `CMD_TEST_ONE` |
| Scoped checks while iterating | `SCOPED_CHECKS_HINT` |
| e2e (+ setup such as a mock server or docker compose) | `CMD_E2E`, `CMD_E2E_SETUP`, `E2E_NOTES` |

Then ask:

1. When is e2e required? (e.g. "anything rendered, the auth flow, the public API") → `E2E_WHEN`
2. Test-file naming convention and the testing guide, if any. → `TEST_FILE_CONVENTION`, `TESTING_GUIDE`,
   `EXAMPLE_TEST_PATH` (the hook's patterns are checked later with `render.mjs --classify`)
3. How do tests stay deterministic here? (fake timers, freezegun, fakes dir, test containers) → `DETERMINISM_TOOLS`
4. Escape hatches agents must not use to get green (`as any`, `# type: ignore`, `//nolint`…). → `TYPE_ESCAPE_HATCHES`
5. Commands agents must never run unasked (deploy, migrations against shared DBs, anything touching devices or
   production). → `FORBIDDEN_COMMANDS`

## Round 3: constraints and definition of done

1. Hard constraints: the 5–10 non-obvious rules that break something when ignored (runtime/platform versions,
   frozen contracts, security and privacy rules, resource cleanup, performance budgets, input/output limits).
   Offer what you found in existing instruction files and docs as a starting list. → `HARD_CONSTRAINTS`,
   `RUNTIME_VERSIONS`, `RESEARCH_CONSTRAINT_CHECKS`, `REVIEW_CONSTRAINT_CHECKS`, `OPENSPEC_CONTEXT`
2. Is there an API/contract document tests should treat as the public interface? → `CONTRACT_DOC_HINT`,
   `MOST_USED_DOCS`
3. Definition of done: confirm the default (all checks pass, e2e when relevant, tests for new behavior, docs and
   specs updated) or adjust.
4. Loop tuning (offer defaults): lite-path definition (`LITE_DEFINITION`), max review rounds (`MAX_REVIEW_ROUNDS`,
   default 3), max parallel sub-tasks (`MAX_PARALLEL`, default 3), shared hotspots that two parallel sub-tasks must
   not both touch (`SHARED_HOTSPOTS`), branch prefix (`BRANCH_PREFIX`, default `change/`).

## Round 4: where knowledge comes from

1. **Task source.** Where do tasks live? None (descriptions only), Notion, Linear, Jira, GitHub Issues, other.
   Ticket key format (e.g. `ABC-123`). → `tracker`, `TICKET_KEY_EXAMPLE` (`TRACKER_NAME` and
   `TRACKER_FETCH_HINT` only for a tracker the renderer doesn't know)
2. **Coding standards.** Links to existing pages (wiki, Notion, Confluence, a repo file elsewhere), or a local
   `docs/ai/coding-standards.md` you'll create (offer to seed it from what you saw in linters and reviews; leave
   the examples if they have nothing). → `standards`, `CODING_STANDARDS_LINKS` or `CODING_STANDARDS`
3. **Team rules store** (where `/feedback` writes durable rules):
   - **markdown** (default, zero setup): `docs/ai/team-rules.md` in the repo, reviewed through PRs.
   - **notion**: a shared database with one saved view per agent role. If they choose it, walk them through
     [`docs/notion-setup.md`](../../../docs/notion-setup.md) and collect the database URL, data source id and the
     seven view URLs. → `rules`, `RULES_DB_NAME`, `RULES_DB_URL`, `RULES_DATA_SOURCE`, `VIEW_*`
   - Rule ID prefix (default: initials of the project, e.g. `ACM`). → `RULE_ID_PREFIX`
4. **Knowledge graph.** Use graphify for codebase questions? Worth it on large repos; skip for small ones.
   → `graph`
