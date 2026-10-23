# Coding standards

The reviewer checks every diff against this page. Keep each standard short, checkable in a diff, and explain why.
Link to a real example in the code when you can. Things a linter or formatter already enforces don't belong here.

<!--
Examples (replace with yours):

## Naming
- Functions are verbs (`calculate_refund`), booleans read as questions (`is_paid`). Why: diffs read like prose.

## Errors
- Raise domain errors from `app/errors.py`; never return `None` to signal failure. Why: callers forget to check.

## Tests
- One behavior per test, named after the behavior (`test_refund_cannot_exceed_paid_amount`).
- No sleeps; use the fake clock in `tests/fakes/clock.py`.

## Dependencies
- New runtime dependencies need a one-line justification in the PR description.
-->
{{CODING_STANDARDS}}
