---
name: task
description: Orchestrates the full delivery loop for a task given as {{TASK_INPUTS}} - research, OpenSpec proposal with user approval, test-first sub-tasks in parallel worktrees, implementation and independent review until every sub-task is approved. Also resumes an interrupted task with "resume <change-id>". Use when the user runs /task or asks to build a feature or fix end to end.
argument-hint: "{{TASK_ARG_HINT}}"
disable-model-invocation: true
---

# /task: orchestrated delivery loop

You are the **orchestrator** and you run in the main session, because only the main session can ask the user
questions and get approvals. You delegate each phase to a subagent, keep the state file current, and talk to the
user only at the gates below. Never write production code or tests yourself.

Agents: `researcher`, `spec-writer`, `test-writer`, `developer`, `reviewer`, `feedback-curator` (`.claude/agents/`).

Team rules: at intake, read the `orchestrator` team rules (`AGENTS.md` › External references) and follow them.
Before the first launch of each agent, read that agent's rules once and add them to its launch prompt under
`Team rules:` as `<ID> [Severity] Rule: Guidance`. If the rules source is unavailable, continue and mention it once
to the user.

## 0. Intake

- `resume <id>`: read the state file (see State), report where it stopped in two lines, continue from there.
<!-- @if tracker=yes -->
- {{TRACKER_NAME}} URL or ticket key: run the `task-intake` skill to get a normalized brief.
<!-- @endif -->
- Description: use it as the brief verbatim.

Pick a kebab-case change id (`add-…`, `fix-…`). If the current branch is the default branch, create
`{{BRANCH_PREFIX}}<id>` and switch to it; otherwise ask once whether to work on the current branch.

## 1. Research (full path) or size check

Launch `researcher` with the brief. Its "Size estimate" decides the path; the user can override it.

- **lite** (small fix): skip to section 5 with a single sub-task. Tell the user in one line that you're taking the
  lite path and why.
- **full**: continue.

If the researcher returned open questions, ask the user now, all at once, with the suggested defaults.

## 2. Spec

1. `openspec new change "<id>"`, then save the research brief and the user's answers as
   `openspec/changes/<id>/research.md` and create the state file.
2. Launch `spec-writer` with: the change id (already created: continue it, don't create a new one), the path to
   research.md, the answers.
3. Show the user the spec-writer's summary **as returned**: the short summary, the sub-task list, and the
   "Not from the task" list with links. Don't paste the spec.

## 3. Approval gate

Wait for the user. Edits → relaunch `spec-writer` with them and show the new summary. Repeat until the user approves.
Record the approval (date, any accepted ASSUMED items) in the state file.

## 4. Split

Run the `subtask-split` skill on `openspec/changes/<id>/tasks.md`. It yields waves of independent sub-tasks.
Record them in the state file.

## 5. Per sub-task loop

Run the sub-tasks of one wave in parallel (one Task call per sub-task in the same message); start the next wave
only when every sub-task of the current wave is approved and merged.

For each sub-task (a sub-task marked `Test behaviors: none (docs)` skips RED and goes straight to GREEN):

1. **RED.** Launch `test-writer` with the sub-task's test behaviors, its scenarios and the public interfaces it
   needs. When it returns, verify:
   - `git show --stat <RED>` lists only test files;
   - the failure evidence is for the intended reason.
   Then append the test file paths to the lock file (see State) and record the RED sha.
   Parallel test-writers commit to the same branch: launch them one after another (they're fast), not in parallel.
2. **GREEN.** Launch `developer` with: RED sha, locked test paths, failure output, the sub-task's `Files:` line.
   It must run in its own worktree. In Claude Code the agent definition does this.
<!-- @if cursor=yes -->
   In Cursor ask for it explicitly in the launch prompt ("run in your own isolated worktree branched from the
   current HEAD").
<!-- @endif -->
3. **REVIEW.** Launch `reviewer` (fresh, never the developer's conversation) with: change id, sub-task, RED sha,
   the developer's branch and head commit.
4. **CHANGES_REQUESTED** → resume or relaunch `developer` on the same branch with the findings, then review again.
   After {{MAX_REVIEW_ROUNDS}} rounds without approval, stop and ask the user how to proceed (show the open findings).
5. **APPROVED** → merge the developer's branch into the change branch (`git merge --no-ff <branch>`), re-run the
   `quality-gate` skill on the merged result, mark the sub-task done in the state file, remove the worktree.
   If a merge conflicts, resolve only trivial conflicts yourself; otherwise relaunch `developer` on the merged
   branch.

Report progress to the user in one line per finished sub-task.

## 6. Finish

A task is done only when every sub-task is APPROVED and merged and the gate passes on the change branch.

- Full path: tick tasks.md, run `openspec validate <id>`, then follow the `openspec-archive-change` skill
  (which syncs the delta specs){{FINISH_GRAPH_STEP}}.
- Lite path: delete `.loop/<id>/`.
<!-- @if tracker=yes -->
- If the task came from {{TRACKER_NAME}}, offer to update its status (don't change it unasked).
<!-- @endif -->
- Summarize for the user: what was built, sub-tasks and review rounds, files changed, anything deferred.

## Feedback during the loop

If the user gives feedback that applies beyond this task, launch `feedback-curator` with the quote, then carry on.
Task-specific feedback goes to the agent working on it.

## State

| Path | Full path | Lite path |
|---|---|---|
| Directory | `openspec/changes/<id>/` | `.loop/<id>/` (gitignored) |
| State file | `loop.md` | `loop.md` |
| Lock file | `locked-tests.txt` | `locked-tests.txt` |

The lock file holds one repo-relative test path per line. `scripts/agent-hooks/block-test-edits.mjs` blocks
edits to those paths from any agent, so keep it accurate; clear it only when the task is finished.

`loop.md` format:

```markdown
# Loop: <id>
Source: <task url or key | "description"> · Path: full|lite · Branch: {{BRANCH_PREFIX}}<id>
Approved: <date> (assumptions accepted: …)

| # | Sub-task | Wave | Status | RED | Dev branch | Rounds | Verdict |
|---|---|---|---|---|---|---|---|
| 1 | <name> | 1 | pending/red/green/review/approved/merged | <sha> | <branch> | 0 | — |

## Log
- <date> <event>
```

Update it after every phase transition, so `/task resume <id>` can pick up from any point.
