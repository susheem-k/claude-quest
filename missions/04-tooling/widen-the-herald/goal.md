# Widen the Herald's Reach

*Tier 2 — Invocation. This mission requires one real `claude` session, run by you,
under your own account. The engine only reads what happened afterward — it never
grades what Claude said.*

The `herald` from the cloister is scoped to exactly `Skill` — nothing more. There's a
`town-ledger.txt` sitting right next to it, but the herald has no way to actually
write to it.

## Goal

Edit `.claude/agents/herald.md`:

- Add `Bash` to its `tools` list
- Extend its instructions so that, when asked to record something, it uses the Bash
  tool to append the requested message as a new line in `town-ledger.txt`

Then open a real `claude` session here and ask the herald to record something.

## Check

`check.js` passes when `town-ledger.txt` has grown past its original line and
`herald.md`'s `tools` field includes both `Skill` and `Bash` — a subagent's
capabilities are exactly what its `tools` list says, nothing implied.
