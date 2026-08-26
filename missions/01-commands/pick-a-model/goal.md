# The Model You Reach For

*Tier 2 — Invocation. This mission requires one real `claude` session, run by you,
under your own account. The engine only reads what happened afterward — it never
grades what Claude said.*

Not every project wants the same model by default. `/model` can pin one, for this
project specifically, so it's not just a per-session choice you have to remember.

## Goal

Open a real `claude` session in this sandbox and use `/model` to switch to Opus,
saved as this project's default (say so explicitly — "switch to opus and save it as
the project default" is enough).

## Check

`check.js` passes when this sandbox's `.claude/settings.json` has `model` set to
Opus — proof the setting actually landed in a file, not just the current session.
