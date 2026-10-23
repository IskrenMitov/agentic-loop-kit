---
name: spec-traceability
description: Checks every requirement and scenario of an OpenSpec change against its sources (the task, the repo) and flags anything assumed or invented, producing a very short report with links. Use after writing or revising an OpenSpec change, before showing it to the user for approval.
---

# Spec traceability

Goal: the user should be able to spot hallucinated scope in under a minute.

## Inputs

- `openspec/changes/<id>/research.md` (contains the task's verbatim essentials and the user's answers).
- `openspec/changes/<id>/specs/**/spec.md`, `design.md`, `tasks.md`.

## Steps

1. For every `### Requirement:` and every `#### Scenario:` in the delta specs, find its source:
   - **TASK**: a quoted line in research.md › "Task" or the user's answers. Note which line.
   - **REPO**: existing code, spec or doc that already implies it. Note `path#Lnn`.
   - **ASSUMED**: neither. Inferred, a default you chose, or "nice to have".
2. Check the tag written in the spec matches what you found. Fix wrong tags in the spec file.
3. Scan design.md and tasks.md for decisions that change observable behavior or scope (new endpoint, new
   setting, new UI state, new dependency, changed default). Each one needs a TASK or REPO source too; otherwise
   it's ASSUMED.
4. Check the reverse direction: every TASK line in research.md is covered by at least one requirement. List
   uncovered ones as **MISSING**.

## Output: `openspec/changes/<id>/traceability.md`

```markdown
# Traceability: <id>

| Item | Source | Where |
|---|---|---|
| Req: <name> | TASK "<short quote>" | [spec](specs/<cap>/spec.md#L12) |
| Scenario: <name> | REPO `src/x/y#L40` | [spec](specs/<cap>/spec.md#L20) |
| Req: <name> | ASSUMED | [spec](specs/<cap>/spec.md#L31) |

## Needs confirmation
- ASSUMED: <one line> → [spec](specs/<cap>/spec.md#L31)
- MISSING: "<task quote>" has no requirement
```

The "Needs confirmation" list is what the user sees. One line per item, at most ~10 items; if there are more,
the spec is too speculative: cut ASSUMED items that aren't needed for the task before reporting.
