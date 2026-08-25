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
with a `PostToolUse` hook matched on the relevant tool (`Skill`, `Task`, etc.) that
appends a line to a log file every time it fires, including which skill/subagent name
was invoked. The player opens their own `claude` session in the sandbox and does the
mission; the engine's `check` step just reads that log — same pattern as GameShell's
`check.sh` reading `pwd`, pointed at hook output instead.

This also lets a mission test *how* something was invoked: an early mission can require
explicit invocation (`/skill-name` in the log); a later mission can require the skill
fired *without* being named, proving the player's `description` frontmatter was written
well enough for Claude to pick it up on its own.

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

Worked example: **The Chronicle Entry** — the player is given a change description and
has to write a commit message for it, graded on subject-line length, imperative mood,
"why not just what" in the body, and no filler opener. 3 of 4 criteria required to pass.

## Player experience

The player never leaves the `claude` CLI. Distributed as an installable plugin
(`.claude-plugin/plugin.json` + a single-plugin `marketplace.json`, so `/plugin install
claude-quest@claude-quest` works directly from the GitHub repo), or usable from a manual
clone without installing anything. Either way, `skills/claude-quest/SKILL.md` makes
Claude itself the game master: it calls the engine (`src/bin/claude-quest.js`) via Bash
and narrates the results, but never fabricates mission content or outcomes. This has a
real architectural consequence, not just a UX one: it's what determines whether a
mission needs a nested session.

- **Tier 1** missions don't need a nested `claude` session at all — the game-master
  session can make the requested file edits directly in the sandbox, the same way a
  player would really use Claude Code day to day.
- **Tier 2** missions specifically require the player to open their **own**, separate
  `claude` session rooted at the mission's sandbox — that's the only way to produce a
  genuine invocation event in that sandbox's hook log, and it's also the actual thing
  the mission is testing (can the player trigger it themselves).
- **Tier 3** missions don't need a nested session either — fixing the broken file is a
  normal edit in the game-master session, and grading itself drives the player's local
  `claude` CLI (see Tier 3 above).
- **Tier 4** missions also don't need a nested session — producing the artifact is a
  normal edit in the game-master session, and grading itself drives an isolated judge
  call against the player's own `claude` CLI (see Tier 4 above).

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

**Still open:** confirming the Tier 2/3 hook telemetry schema against a real live
session (tracked as a repo issue — it's asserted from docs, not yet verified against an
actual run), and authoring the rest of the campaign content — only one example mission
exists per tier so far.

Arc outline (content, mostly not yet built beyond the worked examples above):

1. **Fundamentals** — starting a session, basic prompting, reading a diff, approving vs.
   denying a tool call, permission modes
2. **Configuration** — `CLAUDE.md` memory, `settings.json`, permissions
3. **Extensibility** — hooks, skills (incl. the Tier 3 "broken door" missions), subagents,
   MCP
4. **Automation** — headless/scripting mode (`claude -p`), piping, CI-style usage — the
   one arc where the *engine* legitimately invokes Claude directly in `check.sh`, since
   constructing the correct non-interactive command is the skill being tested, not a
   shortcut around it
5. **Judgment** — Tier 4 missions on writing/communication craft (commit messages,
   explanations, review comments) — started with "The Chronicle Entry"

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

`hints` is an ordered array of strings, revealed one at a time (least to most direct)
on request — see [Player experience](#player-experience).

`setup.js`, `check.js`, and the test-battery runner are the direct analogs of GameShell's
`static.sh`, `check.sh`, and `test.sh` — same responsibilities, expressed as Node modules
instead of POSIX shell so the engine runs natively on Windows/macOS/Linux and can shell
out to the real `claude` CLI directly.
