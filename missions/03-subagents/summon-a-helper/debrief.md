**What this taught you:** a subagent is a single Markdown file at
`.claude/agents/<name>.md` with frontmatter (`name`, `description`, `tools`) and a
system-prompt body — structurally similar to a skill, but conceptually different: a
skill's instructions run *in* the current conversation, sharing its context and (by
default) its tools; a subagent runs in an *isolated* context window with only the
tools its own frontmatter grants it, doesn't see the parent conversation, and returns
only a summary when it's done.
