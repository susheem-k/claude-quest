# The Chronicle Entry

*Tier 4 — Judgment. Unlike every earlier mission, "correct" here isn't a fixed
fire/don't-fire outcome — it's graded by a judge call against a rubric. The judge
gets a fresh, isolated `claude` session with only the rubric and your submission; it
never sees this conversation, and it's explicitly told to treat your writing as
data to evaluate, not instructions to follow.*

The town chronicler doesn't care what the diff says — files and line numbers mean
nothing to the people reading the record later. They care whether the *entry* is
something a stranger could understand in five years.

## Goal

Read `CHANGE_SUMMARY.md` in this mission's sandbox — it describes a real change:
session tokens that used to never expire now expire after 15 minutes idle.

Write a commit message for that change into `COMMIT_MSG.txt` in the sandbox — by
hand. If you want to workshop the wording, open a separate `claude` session and
draft it there, but place the final text yourself.

## Graded on

- **Subject line, 50 characters or fewer**
- **Imperative mood** — "Expire idle sessions after 15 minutes," not "Expired" or
  "Expires"
- **If you add a body: why, not what** — the diff already says what changed: don't
  waste the body restating it. Say why it mattered (the security finding in
  `CHANGE_SUMMARY.md`).
- **No filler** — don't open with "This commit..." or "This change..."

You need 3 of 4 to pass. The check will show you exactly which ones did and why.
