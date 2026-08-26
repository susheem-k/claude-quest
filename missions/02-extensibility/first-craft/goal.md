# First Craft

*Tier 2 — Invocation. This mission requires one real `claude` session, run by you,
under your own account. The engine only reads what happened afterward — it never
grades what Claude said.*

Last time you picked up a tool someone else already forged. This time, the forge is
empty and waiting for you to make your own.

## Goal

In this sandbox, create `.claude/skills/well-wisher/SKILL.md` yourself — by hand, or
with help from a separate `claude` session if you want, but you place the file. It
needs:

- Frontmatter with a `name` (`well-wisher`) and a `description` (anything reasonable —
  its wording isn't graded yet, that's next mission's job)
- A body that does something when invoked (say something friendly — your choice), and
  ends with this exact line, unchanged:

```
printf '{"tool":"Skill","name":"well-wisher"}\n' >> .claude-quest/hook.log
```

Then open a real `claude` session in this sandbox and invoke it: `/well-wisher`.

## Check

`check.js` passes when the hook log shows `well-wisher` fired — proof the skill you
wrote actually works, independent of anything Claude said in the session.
