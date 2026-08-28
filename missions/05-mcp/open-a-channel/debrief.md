**What this taught you:** an MCP server is a real, separate process — connected via
`.mcp.json` at the project root, keyed by a name you choose, pointing at a `command`
(plus `args`) that starts it. `"type": "stdio"` means Claude Code talks to it over
stdin/stdout, the simplest transport, no network involved. This is the "project"
scope — checked in, shared with anyone working in this project — one of three scopes
(local, project, user) that control who sees the connection.
