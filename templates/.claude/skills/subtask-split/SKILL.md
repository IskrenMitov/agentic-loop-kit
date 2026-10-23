---
name: subtask-split
description: Splits an approved OpenSpec tasks.md into independent sub-tasks and orders them into parallel waves based on declared dependencies and file overlap. Use in /task after the user approves the spec, before launching test writers.
---

# Sub-task split

## Input

`openspec/changes/<id>/tasks.md`, grouped as required by `openspec/config.yaml`:

```markdown
## 1. <sub-task name>
Test behaviors:
1. <observable behavior>
Files: src/orders/refund.py, tests/orders/test_refund.py
Depends on: none
- [ ] 1.1 …
```

## Steps

1. Parse each `## <n>.` group into: name, test behaviors, files, dependencies, checklist.
2. Validate each group. Fix tasks.md (and tell the user in one line) if a group:
   - has no test behaviors → it can't go through test-first; either add behaviors from the spec scenarios or
     fold it into a group that has them (pure config/docs groups may be marked `Test behaviors: none (docs)` and
     skip the test-writer);
   - has no `Files:` → derive them from design.md and the research brief.
3. Build waves:
   - a group can only be in a wave after every group it depends on;
   - two groups in the same wave must not share any file (including the same test file) and must not both
     change a shared hotspot: {{SHARED_HOTSPOTS}};
     <!-- Example: "a package's public index, the dependency manifest, the router/route table, DB migrations". -->
   - if they conflict, put the later-numbered one in the next wave.
4. Keep waves small: more than {{MAX_PARALLEL}} parallel sub-tasks rarely pays off; split into further waves.

## Output (append to `loop.md`)

```markdown
| # | Sub-task | Wave | Depends on | Files |
|---|---|---|---|---|
| 1 | <name> | 1 | — | `a.py`, `test_a.py` |
| 2 | <name> | 1 | — | `b.py`, `test_b.py` |
| 3 | <name> | 2 | 1 | `a.py`, `router.py` |
```
