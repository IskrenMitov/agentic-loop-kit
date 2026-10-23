---
name: task-intake
description: Fetches a task from {{TRACKER_NAME}} (URL or ticket key) and normalizes it into a brief (goal, verbatim requirements, acceptance criteria, links, open points) for the /task loop. Use when /task receives a {{TRACKER_NAME}} URL or ticket key.
---

# {{TRACKER_NAME}} task intake

1. Fetch the task with the {{TRACKER_NAME}} MCP tools ({{TRACKER_FETCH_HINT}}). If the tools are unavailable or
   need authentication, tell the user and ask them to authenticate, or to paste the task text instead.
   <!-- Examples: Notion: `notion-fetch` by URL. Linear: `get_issue` by key. Jira: `getJiraIssue` by key.
   GitHub Issues: `issue_read` with owner/repo/number. -->
2. Read the fields (title, status, assignee, priority, project, linked tickets such as `{{TICKET_KEY_EXAMPLE}}`) and
   the body. Fetch linked pages only when the body depends on them (specs, designs), at most 3.
3. Produce the brief. Quote requirements **verbatim**; don't paraphrase them into something stronger or weaker.
   Translate to English only in the Summary line; keep the quotes in their original language.

```markdown
# Brief: <title>
Source: <url> · Status: <status> · Tickets: <keys…>

## Summary
<one or two sentences in English>

## Requirements (verbatim)
- "<quote>"

## Acceptance criteria (verbatim, if present)
- "<quote>"

## Links
- <designs / docs / related pages>

## Open points in the task itself
- <anything the task marks as TBD, questions in comments>
```

Don't change anything in {{TRACKER_NAME}} during intake.
