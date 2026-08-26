**What this taught you:** a subagent can be invoked explicitly by asking for it by
name, the same way `/skill-name` explicitly invokes a skill — Claude routes the
request to it via the `Agent` tool, spawning it with its own isolated context and
its own tool restrictions, then returns only a summary to the conversation that
asked for it.
