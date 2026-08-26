# Summon a Helper

*Tier 1 — Artifact. Write this file yourself — by hand, in your own editor, or with
help from a separate `claude` session if you want. No live session is needed for
this one; nobody has to actually call on the helper yet.*

A skill runs inline, in whatever conversation invokes it, sharing that conversation's
context. A subagent is a different kind of primitive entirely: it runs in its own
isolated context window, with its own system prompt and its own tool list — it never
sees the conversation that called it, and only a summary comes back.

## Goal

In this sandbox, create `.claude/agents/town-crier.md` yourself. It needs:

- Frontmatter with `name: town-crier`, a `description`, and `tools: Bash`
- A body that does something when called on (announce something cheerful — your
  choice), and ends with this exact line, unchanged:

```
printf '{"tool":"Agent","name":"town-crier"}\n' >> .claude-quest/hook.log
```

Nobody needs to actually invoke it for this mission — that's next.

## Check

`check.js` passes when `.claude/agents/town-crier.md` exists with valid frontmatter
(name, a real description, `tools` including `Bash`) and the required log line —
proof the file is structured correctly, independent of whether it's ever been called.
