# The Ledger

*Tier 2 — Invocation. This mission requires one real `claude` session, run by you,
under your own account. The engine only reads what happened afterward — it never
grades what Claude said.*

Every time you run a test command in this sandbox, Claude Code stops to ask
permission — the same question, over and over. By the gate there's a ledger for
exactly this: a standing rule, granted once, so it's never asked again.

## Goal

Open a real `claude` session in this sandbox and use the built-in `/permissions`
command to add an allow rule for exactly this pattern:

```
Bash(npm test:*)
```

## Check

`check.js` passes when this sandbox's `.claude/settings.local.json` has
`Bash(npm test:*)` in its `permissions.allow` list — proof the rule was actually
granted, not just described.
