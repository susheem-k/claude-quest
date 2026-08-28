# Ward of Your Own

*Tier 2 — Invocation. This mission requires one real `claude` session, run by you,
under your own account. The engine only reads what happened afterward — it never
grades what Claude said.*

Everything guarded so far — the well-wisher's scope, the herald's tools — was
enforced by asking Claude to behave, and trusting its judgment to hold. A hook is a
different kind of guard entirely: a plain command, run before the tool it watches,
that can refuse outright. No judgment call, no persuading — it either fires or it
doesn't.

## Goal

There's a `diary.txt` in this sandbox. Build a hook, from scratch, that blocks any
Bash command touching it:

1. Write a script (anywhere in this sandbox — `.claude/hooks/guard.js` is a
   reasonable spot) that reads the hook's JSON payload from stdin. If
   `tool_input.command` mentions `diary.txt`, append this exact line to
   `.claude-quest/hook.log` and exit with code `2` to block the command:

```
{"tool":"Hook","name":"ward-of-your-own"}
```

   Otherwise, exit `0` — everything else gets through.

2. Register it in `.claude/settings.json` under `hooks.PreToolUse`, matched on
   `Bash`, running your script with `node`.

3. Open a real `claude` session here and ask it to run `cat diary.txt`, specifically
   using the Bash tool (say so explicitly — otherwise Claude may just read the file
   directly, which never touches Bash at all, and your hook has nothing to catch).
   It should get blocked.

## Check

`check.js` passes when the hook log shows the ward fired — proof the block actually
happened, independent of anything Claude said.
