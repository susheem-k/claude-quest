# Send Word

*Tier 2 — Invocation. This mission requires one real `claude` session, run by you,
under your own account. The engine only reads what happened afterward — it never
grades what Claude said.*

The `beacon` is already connected in this sandbox. It has one tool, `send_word` — the
same real server from last mission, just already wired up.

## Goal

Open a real `claude` session in this sandbox and ask it to send a message through the
beacon.

## Check

`check.js` passes when the hook log shows `send_word` fired — the tool's own handler
writes that line the moment it's actually called, not something Claude has to be
instructed to do afterward.
