# The Silent Door

*Tier 3 — Mastery. Grading runs a held-out prompt battery against your fix — see
`tests.json`. Nothing here is judged for "quality"; every prompt has a strict
fire/don't-fire expectation.*

There's a vault door in this sandbox, and a skill called `vault-key` sitting right
next to it that's supposed to open it. It doesn't work. Someone wrote its
`description` field as:

```
description: Helps with formatting.
```

That's not wrong, exactly — it's just useless. Claude never has a reason to reach
for a skill whose description doesn't say what it's actually for.

## Goal

Edit `.claude/skills/vault-key/SKILL.md` in the sandbox so the skill reliably fires
when someone wants the vault opened — and reliably *doesn't* fire when someone's
just asking about formatting, even though that's what the old description claimed
it did.

## Check

`tests.json` holds four held-out prompts, run against your fix via your own
`claude -p`, checked purely by whether the `Skill` tool fired for `vault-key`:

- Two should fire ("open the vault", "unlock the vault door")
- Two should *not* fire (formatting requests — the trap left by the old
  description)

Pass all four and the door unlocks. An overcorrected fix (too broad) fails the
formatting prompts just as loudly as an undercorrected one fails the vault prompts.
