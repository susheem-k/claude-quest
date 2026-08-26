# Borrowed Craft

*Tier 2 — Invocation. This mission requires one real `claude` session, run by you,
under your own account. The engine only reads what happened afterward — it never
grades what Claude said.*

This sandbox has both a `herald` subagent and the `well-wisher` skill from the forge.
The herald doesn't bless anyone itself — its own instructions tell it to reach for
`well-wisher` instead. One primitive calling a completely different kind of
primitive.

## Goal

Open a real `claude` session in this sandbox and ask for the herald by name — for
example: "Have the herald deliver a well-wish."

## Check

`check.js` passes when the hook log shows *both* `herald` and `well-wisher` firing —
proof the subagent actually reached for the skill, not just that something vaguely
happened.
