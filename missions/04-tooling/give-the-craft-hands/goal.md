# Give the Craft Hands

*Tier 2 — Invocation. This mission requires one real `claude` session, run by you,
under your own account. The engine only reads what happened afterward — it never
grades what Claude said.*

The well-wisher from the forge is still just talk — every time it fires, it says
something kind and nothing else. There's a `blessing-count.txt` sitting right next
to it, at `0`, that it's never touched.

## Goal

Edit `.claude/skills/well-wisher/SKILL.md` so that, in addition to saying something
encouraging, it uses the Bash tool to read `blessing-count.txt`, add one to the
number in it, and write the result back.

While you're editing it, also add `allowed-tools: Bash` to its frontmatter — a skill
gets every tool the current session has by default; scoping it down to just what it
actually needs is worth doing on purpose, not just leaving wide open.

Then open a real `claude` session here and invoke well-wisher once, so
`blessing-count.txt` actually changes.

## Check

`check.js` passes when `blessing-count.txt` reads `1` and the skill's frontmatter
declares `allowed-tools` including `Bash`.
