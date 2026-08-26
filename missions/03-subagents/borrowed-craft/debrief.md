**What this taught you:** a subagent's own tool list can include `Skill`, so a
subagent can invoke a project's skills the same way the main conversation can —
composition works across these primitives, not just within one of them. A subagent
scoped to `tools: Skill, Bash` can only act by reaching for whatever skills exist,
not by doing arbitrary work itself, which is a real way to constrain what a
delegated task is allowed to do.
