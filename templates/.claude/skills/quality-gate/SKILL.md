---
name: quality-gate
description: Runs the repo's deterministic checks ({{GATE_NAMES}}) and reports pass or fail per check with the first errors. Use before reporting work as done, in the reviewer, and after merging a sub-task.
---

# Quality gate

Run from the repository (or worktree) root, cheapest first, and stop at the first failing step only when the
caller asked for a quick check; otherwise run all and report each.

```bash
{{CMD_LINT}}
{{CMD_TYPECHECK}}
{{CMD_TEST}}
{{CMD_BUILD}}
```

Scope down while iterating: {{SCOPED_CHECKS_HINT}}. The final gate is always the whole repo.
<!-- Example (pnpm monorepo): "`pnpm --filter <package> lint|typecheck|test`". Example (Python): "`pytest tests/orders`". -->

<!-- @if e2e=yes -->
## e2e

Required when the change touches {{E2E_WHEN}}:

```bash
{{CMD_E2E_SETUP}}
{{CMD_E2E}}
```

{{E2E_NOTES}}

<!-- Example: "The mock binds port 4000, so only one e2e run at a time across parallel worktrees: if the port is taken
by another run, wait for it instead of reusing it. Stop the mock afterwards if you started it." -->
If the e2e environment can't start here (no browser, no Docker…), report `e2e: not run (<reason>)`; never report
it as passed.

<!-- @endif -->
## Report

```markdown
{{REPORT_GATE_LINE}}
<for each failure: the command, then the first ~15 relevant error lines>
```

Never "fix" a failure by disabling a rule, skipping a test, or loosening a check.
