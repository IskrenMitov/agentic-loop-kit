# Where the information comes from

The setup fills the templates with facts about your project. Most of them it reads from the repo; the rest it asks
you. This page lists what it needs and where those facts usually live in a team, so you can gather them before
starting. The exact variables are in [`skills/setup/references/placeholders.md`](../skills/setup/references/placeholders.md).

| What | Read from the repo | Ask a human when… | Who usually knows |
|---|---|---|---|
| Stack and runtime versions | manifests, `.nvmrc`/`.python-version`/`.tool-versions`, Dockerfile | the deploy target differs from CI (old browsers, embedded devices, a pinned runtime) | tech lead, platform/infra |
| Lint, typecheck, test, build, e2e commands | CI workflows, package scripts, Makefile | CI does something local runs can't | whoever maintains CI |
| Test conventions and determinism tools | existing tests, test config | there are no tests yet | the team |
| Hard constraints | existing `AGENTS.md`/`CLAUDE.md`/`.cursorrules`/copilot instructions, `CONTRIBUTING.md`, ADRs | almost always: these are the rules people "just know" | tech lead; post-mortems and repeated review comments are a goldmine |
| Commands agents must never run | deploy scripts, infra folders | always confirm | tech lead, ops |
| Definition of done | PR template, branch protection rules | the team's real bar differs from CI | the team |
| API or contract documents | `docs/`, OpenAPI/GraphQL schemas, protobufs | the contract lives outside the repo | API owners |
| Task source | connected MCP servers | always confirm | product / engineering manager |
| Coding standards | linter configs (only what they can't enforce matters), wiki links in docs | they live in a wiki, a Notion page or people's heads | tech lead, senior reviewers |
| Team rules store | — | always choose: repo file or Notion | whoever will curate the rules |
| Language rules (code vs user-facing text) | i18n files, UI strings | mixed-language teams | product, design |

## Tips

- **Start small.** Five sharp hard constraints beat twenty vague ones. Every line in `AGENTS.md` costs tokens on
  every request; keep only what an agent can't discover by reading the code.
- **Seed the rules from reviews.** The comments reviewers write most often are your first team rules; add them with
  `/feedback` after setup.
- **Leave TODOs rather than invent.** The setup marks unanswered sections with `TODO(agentic-loop):` and keeps the
  example; fill them as you learn what the agents get wrong.
