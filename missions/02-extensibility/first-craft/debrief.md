**What this taught you:** a skill is nothing more than a folder at
`.claude/skills/<name>/` containing a `SKILL.md` with YAML frontmatter (`name`,
`description`) and a body of plain instructions. There's no special registration step
and no code to write — Claude Code discovers any skill sitting in that folder
automatically. Custom slash commands used to be a separate mechanism
(`.claude/commands/<name>.md`); Claude Code merged the two, so a command and a skill
now work identically.
