**What this taught you:** Claude Code stores sessions per directory, each with its own
id. `claude --resume` from the shell, or `/resume` from inside a session, lists them and
lets you pick a specific one. `claude --continue` skips the picking entirely and
reattaches to the most recent session in that directory.

That difference is invisible right up until a directory has more than one session — and
a directory you actually work in accumulates them fast. `--continue` is the convenient
path when there's only ever one; the moment there are two, it silently takes the newer,
which is how people end up adding to a conversation they never meant to touch.

Worth knowing: the two are indistinguishable after the fact. What gets recorded is which
session you ended up in, not which flag you typed to get there. So nothing downstream can
catch the mistake for you — choosing deliberately is the only thing that prevents it.
