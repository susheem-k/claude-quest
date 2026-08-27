# Where You Left Off

*Tier 2 — Invocation. This mission needs real `claude` sessions, run by you, under
your own account. The engine only reads what happened afterward — it never grades what
Claude said.*

Nothing you say to Claude in a directory is thrown away when you exit. Every session
stays where you left it, and any of them can be re-entered later. Which makes "get me
back into my session" two different requests wearing one coat: *the most recent one*,
or *that specific one*. The console has a lever for each, and reaching for the wrong
one puts you somewhere you didn't mean to be — quietly, with no error to warn you.

## Goal

Three steps, all in this sandbox:

1. Run `claude`. Say something you'll recognise later. Exit.
2. Run `claude` again — a fresh session, not the one you just left. Say something
   different. Exit.
3. Get back into the session from step 1. Not the one from step 2.

The first time you open a session here, Claude Code will ask you to approve this
sandbox's hook. That hook is the game's session log, and it's what `check` reads —
saying yes is expected.

**For this mission only, don't use `claude-quest session`.** It hands you a command
that goes straight to a specific session, and finding your own way back is the entire
point of this one.

## Check

`check.js` reads this sandbox's session log. It passes when two separate sessions have
been started here *and* the one you re-entered is the first of them. Landing back in
the second session fails — that difference is exactly what's being tested.
