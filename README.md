# agentic-loop-kit

Install a **spec-driven, test-first, multi-agent delivery loop** in your repository, adapted to your project.

One command, `/task <ticket or description>`, then takes a task through research, a spec you approve, failing tests
written by one agent, implementation by another in an isolated worktree, and an independent review, until every
sub-task is approved and merged. `/feedback` turns your corrections into team rules the agents follow from then on.

The kit doesn't ship anyone's internal docs. It ships **templates** and a **setup skill** that reads your repo,
interviews you about your stack, commands, constraints, tracker and standards, and writes a version of the loop
that belongs to your project.

## Install

**Claude Code** (recommended):

```text
/plugin marketplace add IskrenMitov/agentic-loop-kit
/plugin install agentic-loop@agentic-loop-kit
```

Then, at the root of your repository:

```text
/agentic-loop:setup
```

**Cursor, Codex or any other agent:** clone this repo next to yours and tell your agent:

```text
Follow ../agentic-loop-kit/skills/setup/SKILL.md to set up the agentic loop in this repository.
```

The setup takes 10–20 minutes, most of it answering questions. It saves your answers to a JSON file, renders the
templates with a small Node script (deterministic, no hand-editing), merges into existing `AGENTS.md`/`CLAUDE.md`/
settings instead of overwriting them, verifies the result, and offers to commit on a branch.

## What you get in your repo

```text
AGENTS.md                         Constraints, commands, definition of done, pointers (CLAUDE.md imports it)
.claude/agents/                   researcher, spec-writer, test-writer, developer, reviewer, feedback-curator
.claude/skills/                   task (/task), feedback (/feedback), task-intake, quality-gate,
                                  spec-traceability, subtask-split (+ openspec-* from `openspec init`)
.claude/settings.json             Test-lock hook + worktrees branched from HEAD
.cursor/hooks.json                Same hook for Cursor (if you use it)
scripts/agent-hooks/              block-test-edits.mjs: locked tests can't be edited or reverted
openspec/config.yaml              Spec rules: [TASK]/[REPO]/[ASSUMED] tags, testable scenarios, sub-task format
docs/ai/                          workflow, agents, maintaining, team-rules, coding-standards
.claude/agentic-loop.answers.json Your answers, reused by `/agentic-loop:setup --update`
```

## How it works

```text
/task ─► researcher ─► (lite? ──────────────────────────────┐)
            │ open questions → you                          │
            ▼                                               ▼
        spec-writer ─► you approve the ASSUMED list ─► split into waves
                                                            │  per sub-task, in parallel
                                                            ▼
                     test-writer (RED, locked) ─► developer (worktree) ─► reviewer (fresh)
                                                      ▲                       │
                                                      └──── changes ──────────┘
                                                                              │ approved
                                                                     merge + quality gate ─► archive
```

Read [docs/concepts.md](docs/concepts.md) for why each step exists (every one counters a specific way agents
fail), and [docs/where-information-comes-from.md](docs/where-information-comes-from.md) for what the setup will
ask you and where to find it in your organization.

## Requirements

- Git, Node.js ≥ 18 (the hook is a Node script, whatever your stack is).
- [OpenSpec](https://github.com/Fission-AI/OpenSpec) (`npm i -g @fission-ai/openspec`); the setup installs it if you
  agree.
- Claude Code for the full experience (subagents with tool limits, worktree isolation, per-agent hook checks).
  Cursor reads the same `.claude/` files; it gets the lock-file checks but not the per-agent ones.
- Optional: MCP servers for your tracker (Notion, Linear, Jira, GitHub…) and for Notion if you keep team rules
  there; graphify for a codebase graph on large repos.

## Choices the setup asks you to make

| Choice | Options | Default |
|---|---|---|
| Task source | descriptions only, Notion, Linear, Jira, GitHub Issues, other MCP tracker | descriptions only |
| Coding standards | links to existing pages, or a local `docs/ai/coding-standards.md` | local file |
| Team rules store | `docs/ai/team-rules.md` in the repo, or a Notion database ([setup](docs/notion-setup.md)) | repo file |
| Codebase graph | graphify, or plain search | plain search |

## This repo

```text
.claude-plugin/        Marketplace + plugin manifests
skills/setup/          The setup skill, its interview, the answers-file reference and render.mjs
templates/             What gets installed, with {{PLACEHOLDERS}} and <!-- @if --> blocks
examples/acme-orders/  Answers and the rendered AGENTS.md for a fictional project
docs/                  Concepts, where information comes from, Notion setup
tests/                 Hook and renderer tests (node --test "tests/*.test.mjs")
```

Template syntax: `{{NAME}}` placeholders, `<!-- @if key=value -->` … `<!-- @endif -->` blocks on their own lines,
and HTML comments as setup guidance (removed on render, kept as examples next to skipped answers). See the header of
`skills/setup/scripts/render.mjs`.

Contributions welcome: keep templates generic (no company-specific names, links or rules) and run the tests.

## License

MIT
