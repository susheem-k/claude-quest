**What this taught you:** a hook is two independent pieces — a registration in
`.claude/settings.json` (which event, which `matcher`, which command to run) and the
script that command actually runs. `PreToolUse` fires before the matched tool
executes and can block it outright: exit code `2` blocks unconditionally, with
stderr shown as the reason. Unlike a skill's description or a subagent's judgment,
nothing here depends on Claude choosing to comply — the hook runs whether Claude
"wants" to or not.
