**What this taught you:** once a server is connected, its tools show up to Claude
named `mcp__<server>__<tool>` — here, `mcp__beacon__send_word` — and Claude decides to
call one the same way it decides to use any other tool, based on the request and the
tool's own description. From that point on there's no real distinction between an MCP
tool and a built-in one in how Claude reasons about using it; the difference is only
in where the code that runs actually lives.
