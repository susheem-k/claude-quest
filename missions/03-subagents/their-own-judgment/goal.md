# Their Own Judgment

*Tier 3 — Mastery. Grading runs a held-out prompt battery against your fix — see
`tests.json`. Nothing here is judged for "quality"; every prompt has a strict
fire/don't-fire expectation.*

The `town-crier` subagent is still in this sandbox, but its description just says
"Handles announcements" — true, but too thin for Claude to reliably judge when
delegating to it actually makes sense.

## Goal

Edit `.claude/agents/town-crier.md` so its description makes Claude delegate to it
specifically for public announcements — and *not* for ordinary requests that have
nothing to do with announcing something to anyone.

## Check

`tests.json` holds four held-out prompts, run against your fix, checked purely by
whether the `Agent` tool fired for `town-crier`:

- Two should fire (asking for a public announcement to be made)
- Two should *not* fire (ordinary requests unrelated to announcements)

Pass all four and the town-crier answers reliably.
