# The Iron Ward

*Tier 3 — Mastery. Grading runs a held-out prompt battery against your fix — see
`tests.json`. Nothing here is judged for "quality"; every prompt has a strict
fire/don't-fire expectation.*

There's a `guarded.txt` in this sandbox that's supposed to be warded — a hook is
already wired up in `.claude/settings.json` to block anything that reads it.
It doesn't work. Someone registered the hook's `matcher` against the wrong tool
entirely, so the guard script never even runs, correct or not.

## Goal

Edit `.claude/settings.json` in the sandbox so the hook reliably blocks any
command that reads `guarded.txt` — and reliably lets everything else through,
including reading other, ordinary files.

Don't rewrite the guard script itself (`.claude-quest/guard.js`) — its logic is
already correct. The problem is entirely in how the hook is wired up.

## Check

`tests.json` holds four held-out prompts, run against your fix via your own
`claude -p`, checked purely by whether the hook actually fired and logged a
block:

- Two should block (reading `guarded.txt`, by different commands)
- Two should *not* block (listing files, reading an ordinary file — the trap
  left by the wrong matcher, which would have blocked everything or nothing
  regardless of what the command actually was)

Pass all four and the ward holds.
