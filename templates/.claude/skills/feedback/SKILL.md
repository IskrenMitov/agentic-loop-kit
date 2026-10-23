---
name: feedback
description: Records a piece of general feedback (a preference or rule that should apply beyond the current task) in the team rules and, if it is a rule for this repo, proposes the matching AGENTS.md or skill edit. Use when the user runs /feedback or says something like "from now on", "always", "never", "I prefer".
argument-hint: "<the feedback, in your own words>"
---

# /feedback

1. Take the feedback from the arguments, or the user's latest message if none were given. Keep the user's
   wording as the quote.
2. Launch the `feedback-curator` agent with: the quote, the context it came from (current task or change id, the
   file or behavior it was about), today's date.
3. If the curator reports `Blocked`, tell the user why (usually the rules store's MCP server isn't connected) and
   show the drafted entry so it can be added by hand.
4. If the curator proposes a repo edit, show the diff and apply it only after the user agrees.
5. Confirm to the user in one line: where it was recorded and whether the repo now enforces it.
