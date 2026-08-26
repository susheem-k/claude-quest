**What this taught you:** `/permissions` is a built-in slash command for managing
which tools Claude Code can use without stopping to ask you first. Rules you add
through it land in `.claude/settings.local.json` — a personal, project-local file
that isn't shared with your team (unlike `.claude/settings.json`, which is). Use
it so you stop re-approving the same safe, repeated command every session.
