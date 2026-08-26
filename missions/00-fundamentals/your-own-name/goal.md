# Your Own Name

*Tier 1 — Artifact. Write this file yourself — by hand, in your own editor, or with
help from a separate `claude` session if you want. The game master won't write it
for you.*

`First Contact` put facts about a project in a `CLAUDE.md` at that project's root.
This is different: this game keeps its own folder for you specifically — separate
from any mission sandbox, and separate from any real project — that lasts for the
rest of this character's playthrough. It's yours to put whatever you want in.

## Goal

Run `run-root` to get the path to your character's own folder. In it, create or
edit a `CLAUDE.md` and add a line reading exactly:

```
Call me <your nickname>.
```

Replace `<your nickname>` with whatever you want to be called.

## Check

`check.js` passes when your run root's `CLAUDE.md` contains a line matching
`Call me <something>.` — proof there's an actual name there, not just the template
text.
