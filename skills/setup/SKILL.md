---
name: setup
description: Installs the agentic delivery loop (/task with researcher, spec-writer, test-writer, developer, reviewer and feedback-curator agents, a test-lock hook, OpenSpec and team rules) into the current repository, adapted to the project after a short interview. Use when the user runs /agentic-loop:setup or asks to set up the agentic loop, the /task workflow, or "this AI coding setup" in their repo.
argument-hint: "[--update] (re-run against an existing install)"
disable-model-invocation: true
---

# Set up the agentic delivery loop

You install the kit's `templates/` into the user's repository, adapted to their project. Everything you write lives
in **their** repo afterwards; the kit is only the source. Nothing in the templates is specific to any company: they
hold placeholders, conditional blocks and commented examples that a renderer fills from the answers you collect.

Paths: this skill's base directory is `skills/setup/` inside the kit, so the kit root is two levels up. You need
`<kit>/skills/setup/scripts/render.mjs`, `<kit>/skills/setup/references/{interview,placeholders}.md` and
`<kit>/templates/`. If you can't resolve the kit root (e.g. the skill text was pasted), clone
`https://github.com/IskrenMitov/agentic-loop-kit` into a temporary directory and use that.

## 0. Preflight

1. Confirm you are at the root of a git repository. If the working tree is dirty, ask whether to continue; never
   stash or discard the user's changes.
2. Inventory what already exists and would collide: `AGENTS.md`, `CLAUDE.md`, `.claude/agents/`, `.claude/skills/`,
   `.claude/settings.json`, `.cursor/hooks.json`, `openspec/`, `scripts/agent-hooks/`, `docs/ai/`, `docs/README.md`.
   If `.claude/agentic-loop.answers.json` exists, the loop is already installed: switch to `--update` (below).
3. Check prerequisites and report them in one block: `node --version` (≥ 18; the renderer and the hook run on
   Node), `openspec --version`, `graphify --version` (optional). Missing tools aren't blockers yet; section 3
   installs them.

## 1. Detect before you ask

Read the repo to pre-fill as many answers as possible, so the user confirms instead of typing:

- Manifests and tooling: `package.json` (scripts, packageManager, engines), lockfiles, `pyproject.toml`,
  `requirements*.txt`, `go.mod`, `Cargo.toml`, `Gemfile`, `pom.xml`/`build.gradle*`, `*.csproj`, `composer.json`,
  `Makefile`, `justfile`, `Taskfile.yml`, `.tool-versions`, `.nvmrc`, `.python-version`, `Dockerfile`.
- CI: `.github/workflows/*`, `.gitlab-ci.yml`, `.circleci/`, `azure-pipelines.yml`. The CI steps are usually the
  real lint/typecheck/test/build commands; prefer them over guesses.
- Tests: existing test files and their naming convention, test framework config, e2e setup (Playwright, Cypress,
  docker-compose test stacks), fakes/mocks directories.
- Docs: `README.md`, `docs/`, `CONTRIBUTING.md`, existing `AGENTS.md`/`CLAUDE.md`/`.cursorrules`/
  `.github/copilot-instructions.md` (these often already state hard constraints worth keeping).
- Connected MCP servers you can see (Notion, Linear, Jira/Atlassian, GitHub…), to suggest the task tracker and the
  rules store.

Write nothing yet.

## 2. Interview

Follow `references/interview.md`: four short rounds, each showing your detected defaults and asking only what you
couldn't detect or what needs a human decision. Use the AskUserQuestion tool where the answer is a choice; ask
free-text questions in one message per round. Never invent constraints, standards or rules: whatever the user
skips is left as a `TODO(agentic-loop)` with the template's example next to it.

Write the answers to `.claude/agentic-loop.answers.json` using the keys in `references/placeholders.md` (omit
skipped keys; don't add derived ones). Then show a one-screen summary: the answers, the branch you'll work on
(default `chore/agentic-loop-setup`) and the files that will be created or merged (run the renderer with
`--dry-run`, section 4). Wait for the user's go-ahead, then create and switch to the branch.

## 3. Install tooling

Ask before installing anything global.

- **OpenSpec** (required for the full path): `npm install -g @fission-ai/openspec@latest`, then
  `openspec init --tools claude --no-animation` (`--tools claude,cursor` if Cursor is used). It generates the
  `openspec-*` skills, the `/opsx:*` commands and a default `openspec/config.yaml`, which section 4 overwrites with
  the filled-in one. If OpenSpec can't be installed, stop: the full path depends on it.
- **graphify** (only if chosen): install it the way the user's team does, then run `graphify update .` once and add
  `graphify-out/cache/` to `.gitignore`.
- **MCP servers** for the tracker or the Notion rules store: you can't connect them yourself. Tell the user which
  one to connect in their tool's settings.

## 4. Generate

1. Render:

   ```bash
   node <kit>/skills/setup/scripts/render.mjs --answers .claude/agentic-loop.answers.json --out . \
     --overwrite openspec/config.yaml
   ```

   It prints a JSON report: `created`, `overwritten`, `conflicts`, `todos`, `missing`. `missing` must be empty
   (exit 1 otherwise): add the missing answers and re-run. It never overwrites an existing file except those passed
   to `--overwrite`: for each conflict it writes `<file>.agentic-loop-new` next to the original. It appends the
   loop's lines to `.gitignore` (once).
2. Resolve each conflict by merging `<file>.agentic-loop-new` into `<file>`, then delete the `.agentic-loop-new` file:
   - `AGENTS.md` / `CLAUDE.md`: keep every existing rule. Fold the existing content into the new sections
     (constraints → Hard constraints, commands → Commands…). Propose dropping repo overviews or directory listings
     (see `docs/ai/maintaining.md` › Keep AGENTS.md short) but only drop them with the user's OK. `CLAUDE.md` must
     import `@AGENTS.md`; keep any Claude-only lines below the import.
   - `.claude/settings.json`: merge the JSON; add the hook entry and `worktree.baseRef` without removing existing
     hooks or permissions.
   - `docs/README.md`: add the two AI rows to the existing docs index.
   - A same-named agent or skill that already exists: show both and ask which wins.
3. Check what the hook treats as tests:

   ```bash
   node <kit>/skills/setup/scripts/render.mjs --classify .
   ```

   Every real test file must be listed and no source file. If not, set `hookTestPatterns` in the answers (an
   array of regex strings matched against repo-relative paths) and re-render with
   `--overwrite scripts/agent-hooks/block-test-edits.mjs`.

## 5. Verify

Run all of these and report each result:

1. No leftovers: `git grep -nE "\{\{[A-Z0-9_]+\}\}|<!-- @(if|endif)" -- AGENTS.md CLAUDE.md .claude .cursor openspec docs scripts/agent-hooks`
   prints nothing, and no `*.agentic-loop-new` file is left (`git status --porcelain --untracked-files=all`).
2. Hook smoke tests (exit 2 = blocked, 0 = allowed), with one real test path and one real source path:
   ```bash
   echo '{"tool_name":"Edit","agent_type":"developer","tool_input":{"file_path":"'$PWD'/<test path>"},"cwd":"'$PWD'"}' \
     | node scripts/agent-hooks/block-test-edits.mjs; echo "exit $?"   # expect 2
   echo '{"tool_name":"Edit","agent_type":"developer","tool_input":{"file_path":"'$PWD'/<source path>"},"cwd":"'$PWD'"}' \
     | node scripts/agent-hooks/block-test-edits.mjs; echo "exit $?"   # expect 0
   echo '{"tool_name":"Edit","agent_type":"test-writer","tool_input":{"file_path":"'$PWD'/<source path>"},"cwd":"'$PWD'"}' \
     | node scripts/agent-hooks/block-test-edits.mjs; echo "exit $?"   # expect 2
   ```
3. `openspec validate --all` exits 0. On a fresh install it prints "No items found to validate"; that's a pass.
4. The commands in the AGENTS.md Commands table: offer to run install, lint and one test file. Report failures as
   they are; they are facts about the project, not something to fix during setup.
5. `.claude/settings.json` (and `.cursor/hooks.json`, if installed) parse as JSON.

## 6. Hand over

1. Show `git status` and a short summary: files created and merged, the TODOs from the report (with paths), tooling
   installed or still missing, MCP servers to connect.
2. Offer to commit on the branch (`chore: set up agentic delivery loop`), including
   `.claude/agentic-loop.answers.json` so later updates reuse the answers. Don't push unless asked.
3. Tell the user how to start: restart the session so the new agents and skills load, run `/task <description>` on a
   small fix first (it takes the lite path), and `/feedback` whenever they correct the agents. Point them to
   `docs/ai/workflow.md`.

## `--update`

When the repo already has the loop (`.claude/agentic-loop.answers.json` exists):

1. Pull the latest kit (`/plugin marketplace update agentic-loop-kit`, or `git pull` in the clone).
2. Ask whether any answer changed and update the answers file.
3. Render into a scratch directory (`--out <tmp>`), diff each file against the installed one, and show only the
   template changes that don't touch local edits. Apply what the user accepts. Never overwrite local
   customizations silently.
