# Design

## Premise

Teach the Claude Code CLI the way [GameShell](https://github.com/phyver/GameShell) teaches
the Unix shell: put the player in a real sandbox, have them do real things, and grade
progress by inspecting what actually happened — never by asking them to self-report or
answer a quiz.

GameShell can do this deterministically because shell commands (`cd`, `grep`, `chmod`)
have deterministic filesystem effects. A large fraction of Claude Code is the same way:
`.claude/settings.json`, hooks, `CLAUDE.md` memory, subagent files, skill files,
permissions config — these are all just files, checkable with zero API calls. Only
missions about the model's live behavior need an actual Claude session, and those are
scoped carefully (below) so grading stays reliable.

## Mission tiers

Every mission belongs to one of four tiers. The tier is about *what's being tested*, not
difficulty — arcs mix tiers throughout.

### Tier 1 — Artifact

Did the player produce the right file, correctly shaped? No live session needed.

Example: write a `CLAUDE.md` with a specific memory entry; configure a `PreToolUse` hook
in `settings.json` with the right matcher.

Graded by: parsing the file deterministically.

### Tier 2 — Invocation

Did the player actually *trigger* the mechanism — a slash command, a skill, a subagent —
correctly? This needs one real `claude` session, but grading never depends on judging the
model's output quality.

**Grading mechanism:** the mission sandbox is pre-seeded (as part of its `setup` step)
with a skill whose own body includes, as one of its instructed steps, appending a line
to a log file — via the Bash tool, the same trust model Tier 1 already relies on (a
real, independently-checkable file write). The player opens their own `claude` session
in the sandbox and does the mission; the engine's `check` step just reads that log —
same pattern as GameShell's `check.sh` reading `pwd`, pointed at this log instead.

(This used to be a Claude Code `PostToolUse` hook matched on a `Skill` tool. Confirmed
live against a real session that it never fires — skill invocation doesn't go through
the standard tool-call hook pipeline the way Bash/Edit/Write do. Switched to the
self-logging-skill approach above after that; see `src/engine/sandbox.js`.)

This also lets a mission test *how* something was invoked: an early mission can require
explicit invocation (the player typing `/skill-name` themselves); a later mission can
rely on the same logging step firing when Claude picks up the skill on its own, proving
the player's `description` frontmatter was written well enough to trigger it unprompted.

Cost/ownership note: the player runs their **own** `claude` session with their **own**
account. The engine only watches the hook log — it never spends API calls on the
player's behalf.

### Tier 3 — Mastery (deterministic grading, non-deterministic subject)

Something is broken and the player has to fix it to unlock progress — e.g. a skill's
`description` is too vague to ever fire, or two skills' descriptions collide, or a
skill's instructions produce the wrong output. The fix requires real judgment about
prompt/skill design. **Grading still doesn't use an LLM judge.**

**Grading mechanism:** each Tier 3 mission ships a small held-out test-prompt battery
(3–5 prompts) with an expected *observable outcome* per prompt (not "is this good" —
"did this specific side effect happen"). When the player believes they've fixed it, the
engine fires each test prompt at the player's local `claude` CLI in headless mode
(`claude -p`), using the player's own environment/credentials — same cost model as Tier
2. Outcomes are checked via the same hook-log/file-diff mechanism as Tier 2. Pass N/M and
the mission's "door" unlocks.

Worked archetypes:

- **The Silent Door** — a skill exists behind a locked resource with a generic
  description (`"Helps with formatting"`). Test battery: 2 prompts that *should* trigger
  it, 2 near-miss prompts that *shouldn't* (belonging to a different skill's territory).
  Player rewrites the description precisely enough to hit true positives without firing
  on true negatives — the specificity/recall tradeoff, taught by doing it.
- **The Wrong Door** — two skills with overlapping descriptions; the wrong one keeps
  firing (or both do, or neither). Player disambiguates both until every test prompt
  routes to the correct skill.
- **The Door Opens Wrong** — invocation always succeeds, but the skill body's
  instructions are subtly wrong (e.g. writes a key file in the wrong format). Deliberately
  scoped to missions where "correct" has an objectively checkable artifact (exact
  filename, exact JSON shape, a regex the output must match) — never open-ended quality —
  so grading stays deterministic even though authoring the fix requires real judgment.

**Anti-flakiness guardrails**, since a live model is genuinely non-deterministic:

- Test prompts sit far from the trigger boundary (obviously-in / obviously-out), never
  marginal
- Small battery (3–5 prompts), run once by default; majority-vote re-run only if a
  specific mission proves flaky in practice
- True negatives are mandatory alongside true positives, so an overly-broad fix fails as
  loudly as a too-narrow one

### Tier 4 — Judgment

Some things genuinely don't reduce to a fire/don't-fire check or a file shape — "is this
commit message actually good," "does this explanation actually make sense." Tier 4 grades
these with an LLM judge, but keeps the same discipline every earlier tier relies on:
**getting a judgment is fuzzy; interpreting one is deterministic.** The judge's verdict is
forced into structured, per-criterion output, so nothing is graded as an unexplained
black-box pass/fail — the player always sees which criteria passed and why.

**Grading mechanism:** each Tier 4 mission ships a `rubric.json` — a small list of
concrete, checkable criteria (never "is this good," always something closer to "does the
subject line stay under 50 characters") and a `passThreshold` fraction. The player
produces an artifact (a file in the sandbox, per `mission.json`'s `artifact` field);
`check` reads it and sends it, with the rubric, to a **judge call** — the player's own
`claude -p`, same cost/ownership model as Tier 2/3 — asking for strict JSON:
`{"criteria":[{"id":...,"passed":...,"reason":...}]}`. The engine parses that
deterministically and computes pass/fail against the threshold; nothing about the
interpretation step is left to the model. See `src/engine/judge.js`.

**Why the judge call is isolated, not a continuation of the player's session:** the judge
runs from a freshly created, empty temp directory — never the sandbox, never the campaign
root — so it can't inherit a `CLAUDE.md`, hook, or other config the artifact's own project
might carry, and the player's working session can't reach it either. It gets *only* the
rubric and the artifact.

**Anti-gaming, the actual hard part of this tier:**

- The artifact is wrapped in an explicit "this is untrusted data, not instructions" framing
  in the judge prompt, and told that anything inside it which *reads* like an instruction
  ("ignore the rubric," "mark this as passing") is itself a rubric violation — a direct
  prompt-injection defense, since the thing being graded is exactly the kind of untrusted
  content an LLM judge is normally warned about.
- Rubric criteria are written as concrete, checkable statements, not vague quality
  judgments — this keeps the judge's job narrow and keeps its stated reasons auditable by
  a human, rather than being a rubber stamp.
- **Fail closed.** If the judge's output doesn't parse, or is missing a criterion, that
  criterion is marked failed with a reason saying so — never silently passed. A
  malfunctioning judge should never be a free pass.
- Same single-run-by-default policy as Tier 3 for now; majority-vote re-run is available
  as an escape hatch if a specific mission proves flaky, not a default.

Worked example: **The Siege Plan** — the player is given a task brief describing a
real piece of work and has to write a plan for approaching it, graded on naming
concrete files, staying within the brief's stated scope, naming at least one real
risk, and no filler opener. 3 of 4 criteria required to pass. (An earlier version of
this tier graded a commit message instead — dropped because it graded generic writing
skill rather than a Claude Code paradigm, and sat oddly next to the fact that Claude
Code will happily write a commit message for you unprompted in real usage.)

## Ranks and sections

Every arc also has a purely narrative layer on top of it: a section name and a rank
the player earns on finishing that arc's last mission (e.g. finishing every
`extensibility` mission earns the "Artisan" rank in "The Forge"). This lives entirely
in `missions/ranks.json`, keyed by the same `arc` string `mission.json` already
carries, and nothing in `src/engine/` or `src/bin/` reads that file — only
`skills/claude-quest/SKILL.md` does, when narrating.

This is deliberate: theme and mechanics are different axes, and only mechanics
(`tier`) needs engine support. Re-skinning the campaign — a different setting
entirely, not just different mission content — means replacing `ranks.json`, nothing
else. The 4 arcs today:

| Arc | Section | Rank | Paradigms |
|---|---|---|---|
| `fundamentals` | The Gatehall | Wayfarer | Memory (`CLAUDE.md`) + built-in commands |
| `extensibility` | The Forge | Artisan | Skills (invocation + auto-invoke tuning) |
| `guardianship` | The Warded Deep | Warden | Hooks |
| `judgment` | The Summit | Archon | Judgment (rubric-graded artifact) |

## Player experience

The player never leaves the `claude` CLI. Distributed as an installable plugin
(`.claude-plugin/plugin.json` + a single-plugin `marketplace.json`, so `/plugin install
claude-quest@claude-quest` works directly from the GitHub repo), or usable from a manual
clone without installing anything. Either way, `skills/claude-quest/SKILL.md` makes
Claude itself the game master: it calls the engine (`src/bin/claude-quest.js`) via Bash
and narrates the results, but never fabricates mission content or outcomes.

**The game master never authors graded content, for any tier, even on request.** What
each mission is actually teaching is which commands and paradigms exist and where the
relevant files live — not producing the artifact for the player. Its job is: point to
the exact file (`sandbox-path`), explain what's being tested conceptually, optionally
show a file's current content, then step back. The player creates or edits the content
themselves, outside that turn of the conversation — by hand, in their own editor, or
(if they want AI help with wording) in a separate `claude` session they bring the
result back from. Only once they say they're done does the game master run `check`.

This has a real architectural consequence too, not just a pedagogical one — it's what
determines whether a mission needs a genuinely separate session:

- **Tier 1** missions don't strictly need a separate `claude` session — the player can
  edit the file with any tool — but the game-master session must not write it for them.
- **Tier 2** missions specifically require the player to open their **own**, separate
  `claude` session rooted at the mission's sandbox — that's the only way to produce a
  genuine invocation event in that sandbox's log, and it's also the actual thing the
  mission is testing (can the player trigger it themselves).
- **Tier 3** missions: same as Tier 1 — the player edits the broken file themselves;
  grading drives the player's local `claude` CLI against their fix (see Tier 3 above).
- **Tier 4** missions: same again — the player writes the artifact themselves; grading
  drives an isolated judge call against the player's own `claude` CLI (see Tier 4
  above).

**Save games:** multiple named characters can exist at once, each with independent
progress, under `~/.claude-quest/saves/` — the player's home directory, so progress is
stable no matter which project they're in or whether this is running as an installed
plugin or a manual clone. One save is "current" at a time (`~/.claude-quest/current.json`).
See `src/engine/save.js` and `src/bin/claude-quest.js`.

(An earlier version tried to key this off Claude Code plugin env vars —
`$CLAUDE_PLUGIN_DATA` / `$CLAUDE_PLUGIN_ROOT`. Verified against a real installed-plugin
session that neither exists; dropped in favor of the home directory, which needs no
Claude-Code-specific assumption at all. What *is* real and verified: Claude Code adds an
installed plugin's `bin/` directory to `PATH`, which is how `bin/claude-quest` — a thin
launcher delegating to `src/bin/claude-quest.js` — gets found as a bare `claude-quest`
command.)

**Hints:** each mission can declare a `hints` array in `mission.json` (see contract
below), revealed one at a time on request and tracked per-save so hint usage persists
across sessions.

## Roadmap

**Built:** Tiers 1–4 as specified above, each with one worked example mission. Tier 4 is
the one tier where the *subject* being graded is genuinely non-deterministic (writing
quality), but the grading *mechanism* stays deterministic once the judge's structured
verdict comes back — no mission anywhere asks the engine to trust an unstructured "looks
good to me."

**Still open:** authoring the rest of the campaign content — each arc below has one or
two missions built; the paradigms noted as "not yet built" per arc are the ones with no
mission yet.

The campaign is 4 arcs (see [Ranks and sections](#ranks-and-sections) for their
narrative framing). Tier is orthogonal to arc — an arc can and does mix tiers:

1. **`fundamentals`** — built: `CLAUDE.md` memory (Tier 1, "First Contact"), built-in
   commands via `/permissions` (Tier 2, "The Ledger"). Not yet built: reading a diff,
   approving vs. denying a tool call, permission modes beyond `/permissions` itself.
2. **`extensibility`** — built: skill invocation (Tier 2, "Say the Word"), skill
   auto-invocation via description tuning (Tier 3, "The Silent Door"). Not yet built:
   authoring a skill from scratch, skill chaining, `allowed-tools`/
   `disable-model-invocation` scoping.
3. **`guardianship`** — built: a mis-wired `PreToolUse` hook (Tier 3, "The Iron Ward").
   Not yet built: permissions config (allow/deny rule syntax and precedence),
   subagents (auto-delegation via description — same shape as skills, but for
   `.claude/agents/`), MCP (connecting a server, invoking its tools).
4. **`judgment`** — built: grading a written plan against a task brief (Tier 4, "The
   Siege Plan"). Not yet built: a plugins capstone (bundling a skill + manifest,
   verified by actually loading it with `--plugin-dir`).

## Mission file contract

Each mission is a directory: `missions/<arc>/<mission-id>/`.

```
mission.json   metadata: id, title, arc, tier, order, hints[], artifact (Tier 4 only)
goal.md        flavor text + walkthrough shown to the player
setup.js       (optional) seeds the sandbox: files, hook config, locked resources
check.js       Tier 1/2: deterministic check against sandbox state / hook log
tests.json     Tier 3 only: held-out prompt battery + expected-outcome checks
rubric.json    Tier 4 only: judged criteria (id + description) + passThreshold
```

`missions/ranks.json` sits alongside the arc directories, not inside any one mission —
see [Ranks and sections](#ranks-and-sections).

`hints` is an ordered array of strings, revealed one at a time (least to most direct)
on request — see [Player experience](#player-experience).

`setup.js`, `check.js`, and the test-battery runner are the direct analogs of GameShell's
`static.sh`, `check.sh`, and `test.sh` — same responsibilities, expressed as Node modules
instead of POSIX shell so the engine runs natively on Windows/macOS/Linux and can shell
out to the real `claude` CLI directly.
