# Open a Channel

*Tier 1 — Artifact. Write this file yourself — by hand, in your own editor, or with
help from a separate `claude` session if you want. The game master won't write it
for you.*

Everything so far has lived inside the tower — a skill, a subagent, a hook, all built
from things the tower already had. An MCP server is different: a real, separate
process, speaking a real protocol, that Claude Code just happens to be able to talk
to. There's a working one waiting outside the gate, called `beacon`. It's real code —
read `mcp-server.mjs` next to `mcp-server-path.txt` in this sandbox if you're curious
how it's built.

## Goal

In this sandbox's root, create `.mcp.json` connecting the `beacon` server. Its exact
path is in `mcp-server-path.txt` — use it as an argument to `node`.

## Check

`check.js` passes when `.mcp.json` has an `mcpServers` entry whose command actually
points at that server. Nobody needs to talk to it yet — that's next.
