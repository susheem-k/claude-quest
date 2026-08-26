# Second Craft

*Tier 3 — Mastery. Grading runs a held-out prompt battery against your fix — see
`tests.json`. Nothing here is judged for "quality"; every prompt has a strict
fire/don't-fire expectation.*

The well-wisher you forged is still in the sandbox — but its description just says
"Says something nice," which is true of almost anything positive. That means it's
just as likely to fire when someone wants a compliment on their code as when someone
actually wants a blessing.

## Goal

Edit `.claude/skills/well-wisher/SKILL.md` so its description makes Claude reach for
it precisely when someone wants a well-wish, blessing, or good-luck send-off — and
*not* when they just want positive feedback or a compliment on something they made.

## Check

`tests.json` holds four held-out prompts, run against your fix via your own
`claude -p`, checked purely by whether the `Skill` tool fired for `well-wisher`:

- Two should fire (wishing someone luck, asking for a blessing)
- Two should *not* fire (asking for feedback, asking for a compliment — close enough
  to "something nice" to catch an overly broad fix)

Pass all four and the craft holds.
