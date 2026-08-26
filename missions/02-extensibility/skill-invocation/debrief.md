**What this taught you:** Skills are reusable instructions stored as a `SKILL.md`
file under `.claude/skills/<name>/`. Typing `/name` invokes one explicitly — the
same mechanism as a custom slash command (Claude Code merged the two: a file at
`.claude/commands/name.md` and a skill at `.claude/skills/name/SKILL.md` both
create `/name`). This is the manual way to fire a skill; the next mission covers
the other way — Claude choosing to use one on its own.
