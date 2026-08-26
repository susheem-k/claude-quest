**What this taught you:** `/cost` (an alias of `/usage`) shows token usage and cost
for the current session, broken down by where it went. It has no side effect on any
file — it's purely a way to check in on what a session is actually spending, the
same information that's also available via `claude -p --output-format json`'s
`total_cost_usd` field when scripting.
