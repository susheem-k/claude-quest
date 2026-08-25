# Say the Word

*Tier 2 — Invocation. This mission requires one real `claude` session, run by you,
under your own account. The engine only reads what happened afterward — it never
grades what Claude said.*

A skill named `torch-lighter` is already sitting in this sandbox's `.claude/skills/`.
It doesn't do anything dangerous — it just needs to be *invoked* for this mission to
count as complete.

## Goal

Open a real `claude` session in this sandbox and explicitly invoke the skill:

```
/torch-lighter
```

## Check

The sandbox's `.claude/settings.json` is pre-seeded (see `setup.js`) with a
`PostToolUse` hook matched on the `Skill` tool. Every time a skill fires, the hook
appends one line to `.claude-quest/hook.log`. `check.js` passes when that log shows
`torch-lighter` was invoked — proof the invocation actually happened, independent of
anything Claude said in the session.
