# Team rules in Notion (optional)

The default rules store is `docs/ai/team-rules.md` in the repo. Use Notion instead when rules should be shared
across several repos or edited by people who don't open PRs.

## 1. Create the database

Create a full-page database (e.g. "Coding Agent Rules") with these properties. The agents read **only properties**,
never page bodies, so the names must match exactly.

| Property | Type | Values |
|---|---|---|
| `Rule` | Title | One imperative line |
| `ID` | Unique ID | Prefix of your choice (e.g. `ACM` → `ACM-12`) |
| `Guidance` | Text | ≤ ~300 chars, self-contained how/why |
| `Status` | Select | `Active`, `Proposed`, `Superseded` |
| `Severity` | Select | `Must`, `Should`, `Prefer` |
| `Applies to` | Multi-select | `orchestrator`, `researcher`, `spec-writer`, `test-writer`, `developer`, `reviewer`, `all agents` |
| `Scope` | Multi-select | One option per repo, plus `all repos` |
| `Category` | Select | e.g. `testing`, `architecture`, `style`, `process`, `security` |
| `Keywords` | Text | Comma-separated, for dedupe |
| `Source quote` | Text | The human's words |
| `Source link` | URL | Task, PR or spec |
| `Enforced in` | Text | Repo file that also states the rule |
| `Supersedes` / `Superseded by` | Relation (self, two-way) | |

## 2. Create one view per role

For each of `orchestrator`, `researcher`, `spec-writer`, `test-writer`, `developer`, `reviewer`:

- Filter: `Status` is `Active` **and** `Applies to` contains `<role>` or `all agents` **and** `Scope` contains
  `<repo>` or `all repos`.
- Sort: `Severity` (Must, Should, Prefer), then `ID`.
- Visible properties: `ID`, `Rule`, `Guidance`, `Severity`, `Enforced in` (fewer properties = fewer tokens).

Plus one human view, "Inbox · Proposed": `Status` is `Proposed`, sorted by created time.

## 3. Collect the identifiers

The setup skill needs:

- the database URL;
- the data source id (`collection://…`): with the Notion MCP server connected, fetch the database and copy it from
  the result;
- each view's URL (`view://…`): copy it from the view's "Copy link to view", or from the fetched database.

## 4. Connect the Notion MCP server

In every tool the team uses (Claude Code, Cursor…), connect the Notion MCP server and share the database with the
integration. Without it, `/feedback` reports `Blocked` and shows the drafted rule so a human can add it by hand.
