**What this taught you:** `/compact` replaces the conversation history with a
summary (optionally focused on what you specify), rather than deleting it — you keep
working with far fewer tokens carried forward on every later request. It's a
judgment call between compacting (cheaper per request, loses whatever the summary
leaves out) and just clearing (`/clear`) to start over entirely.
