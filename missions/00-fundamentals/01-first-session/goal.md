# First Contact

*Tier 1 — Artifact. Write this file yourself — by hand, in your own editor, or with
help from a separate `claude` session if you want. The game master won't write it
for you.*

You've just joined a project. Nobody wrote down how to run its tests, and you're
tired of asking. Claude Code reads a `CLAUDE.md` file in the project root at the
start of every session — anything you put there, it already knows next time.

## Goal

In this sandbox's project root, create a `CLAUDE.md` file that records how to run
this project's tests: `npm test`.

It doesn't need to be fancy. One line is fine. What matters is that the fact is
actually in the file Claude Code reads automatically — not in a comment, not in a
README nobody opens.

## Check

`check.js` passes when `CLAUDE.md` exists in the sandbox root and contains the
string `npm test` (case-insensitive).
