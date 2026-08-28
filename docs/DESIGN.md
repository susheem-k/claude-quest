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

That finding is about skill invocation specifically, not about hooks generally.
`SessionStart` was later confirmed live to fire reliably — including under `claude -p`
— and the `commands` arc's "Where You Left Off" is graded on it, the first mission in
the campaign to be graded on a real Claude Code hook (see
`missions/01-commands/where-you-left-off/setup.js`). Its payload's `source` field
reports `startup` for a new session and `resume` for a re-entered one. What it does
*not* distinguish is `--resume` from `--continue`: both report `resume`. So that
mission grades which session the player landed in, never which flag they typed — which
is the honest signal, and also the actual lesson.

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
- Prompts tell the model exactly what action to take ("use the Bash tool to run exactly
  this command") rather than describing a goal and leaving the model to decide how to
  pursue it — an underspecified prompt sometimes gets the model exploring instead of
  acting (or, for a destructive-sounding action, refusing on its own judgment even under
  direct instruction), which is noise from the model's own interpretation, not a signal
  about whether the fix works

**A load-bearing operational detail:** `runTestBattery`'s spawned `claude -p` calls pass
`--permission-mode bypassPermissions`. Without it, a battery prompt run against a
genuinely fresh sandbox — the state every real player's sandbox is actually in — gets
refused in one of several different ways depending on what the fix asks Claude to do: an
untrusted-workspace warning, a flat "output redirection blocked," or a silent
"needs approval" that never resolves headless. Confirmed live: identical commands succeed
immediately with the flag and fail every one of those ways without it. Safe specifically
because this call only ever targets a disposable, engine-provisioned mission sandbox,
never the player's real project.

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

No Tier 4 mission is currently built. Two earlier attempts were retired for the same
reason: a graded commit message, then a graded task plan, both graded generic
writing/communication skill rather than a Claude Code paradigm specifically — worth
keeping the mechanism (it's the only tier that handles genuinely non-fixed-answer
subjects), but the next mission built against it needs a subject where the *judgment*
itself is the Claude Code lesson, not just the writing quality.

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
else. `ranks.json` only has entries for arcs that actually have a mission built; see
[Roadmap](#roadmap) for arcs planned but not yet built. The arcs ranked today:

| Arc | Section | Rank | Paradigms |
|---|---|---|---|
| `fundamentals` | The Gatehall | Wayfarer | Memory (`CLAUDE.md`), incl. the game's own per-character run root |
| `commands` | The Console | Adept | Built-in commands, graded where they leave a real file effect |
| `extensibility` | The Forge | Artisan | Skills (invocation, authoring, auto-invoke tuning) |
| `subagents` | The Cloister | Marshal | Subagents (authoring, explicit + implicit invocation, invoking a skill) |
| `hooks` | The Watch | Sentinel | Hooks (authoring a `PreToolUse` guard, fixing a broken matcher) |
| `tooling` | The Armory | Warden | Built-in commands with a real config effect (`/permissions`), extending a skill/subagent to do real work |
| `mcp` | The Signal Tower | Envoy | MCP (connecting a real stdio server, invoking its tool) |

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

**Why grading never parses session transcripts:** it's tempting, for a mission like
"basic commands" where most built-in commands leave no file behind, to read
`~/.claude/projects/<project>/<session-id>.jsonl` and check whether the player typed a
given command. Rejected for two reasons, confirmed live: a slash command typed as a
`claude -p` prompt isn't parsed as a command at all — it's literal text handed to the
model, which just tries to interpret it — so the mechanism wouldn't even let the engine
script a battery the way Tier 3 does. And separately, Claude Code's own docs say the
transcript's entry format is internal and can change on any release, which is exactly
the kind of foundation this project avoids building on. A command with no file effect
stays informational-only rather than gradable on an unstable signal.

That ban is narrower than it sounds, and **Sessions** below deliberately sits on the
other side of it: it asks whether a named transcript *file exists* and never opens one.
The unstable thing is the entry format, not the directory layout — the latter is what
`claude --resume` itself depends on.

**Save games:** multiple named characters can exist at once, each with independent
progress, under `~/.claude-quest/saves/` — the player's home directory, so progress is
stable no matter which project they're in or whether this is running as an installed
plugin or a manual clone. One save is "current" at a time (`~/.claude-quest/current.json`).
See `src/engine/save.js` and `src/bin/claude-quest.js`.

**Run root:** separate from a save's JSON file and separate from any mission's
disposable sandbox, each character also gets a persistent directory —
`~/.claude-quest/saves/<slug>/` — that lasts the whole playthrough. A mission can point
the player at a file there (`run-root` prints the path, the way `sandbox-path` does for
a mission sandbox) when what it's testing is meant to last past that one mission, not
be thrown away with the sandbox. See `runRootFor` in `src/engine/save.js`.

(An earlier version tried to key this off Claude Code plugin env vars —
`$CLAUDE_PLUGIN_DATA` / `$CLAUDE_PLUGIN_ROOT`. Verified against a real installed-plugin
session that neither exists; dropped in favor of the home directory, which needs no
Claude-Code-specific assumption at all. What *is* real and verified: Claude Code adds an
installed plugin's `bin/` directory to `PATH`, which is how `bin/claude-quest` — a thin
launcher delegating to `src/bin/claude-quest.js` — gets found as a bare `claude-quest`
command.)

**Sessions:** a Tier 2 mission needs the player working in their own `claude` session
rooted at the mission sandbox, and stepping away used to mean losing that conversation —
a bare `claude` starts over, and `claude --continue` means "most recent session in this
directory," which is the wrong one as soon as two characters share a sandbox (sandboxes
are keyed by mission, not by character — see `sandboxDirFor`). So each character gets a
session id per mission, minted on first ask and stored in its save (`sessionIdFor` in
`save.js`). `claude-quest session` prints `claude --session-id <id>` until that session
has actually been recorded, and `claude --resume <id>` from then on — the two flags are
contradictory as a pair, so this is a choice, not a merge.

Choosing between them means asking whether the transcript exists yet, which means knowing
where Claude puts it: `~/.claude/projects/<cwd, every non-alphanumeric replaced by a
dash>/<session-id>.jsonl` (or `$CLAUDE_CONFIG_DIR` in place of `~/.claude`). That naming
rule is reproduced in `src/engine/claudeSessions.js` straight from the algorithm in the
`claude` binary, and checked against the 17 recorded cases in Quil's `TestEscapeCWD` —
which is where the whole approach is borrowed from, having solved the same problem for
restoring terminal panes. Approximating that rule is the known failure mode, not a
hypothetical one: an earlier version there replaced only the obvious separators, missed
`.`, and every path containing a dot silently resolved to a directory that wasn't there.

Minting the id up front is what keeps this safe. The engine never has to *discover* which
session the player opened — only probe for one it named itself — so being wrong about the
directory surfaces as "not started yet," which prints a working start command, rather than
as an attach to somebody else's conversation.

**Hints:** each mission can declare a `hints` array in `mission.json` (see contract
below), revealed one at a time on request and tracked per-save so hint usage persists
across sessions.

**Skipping:** Tier 2+ missions have a real-world dependency the engine can't force —
the player has to go open a separate `claude` session by hand. Wrong machine, no
second terminal handy, or just done for the evening, and the campaign used to have no
answer: `currentMissionKey` only ever advances past a `check` that actually passed, so
a player who couldn't or wouldn't do that right then was stuck on that mission for
good. (Reported against a real playthrough stuck on `01-commands/where-you-left-off`,
which needs three separate sessions started by hand — [issue
#16](https://github.com/susheem-k/claude-quest/issues/16).)

`skip` (`src/bin/claude-quest.js`) records the mission key in a save's `skipped` array
— a sibling to `completed`, never a substitute for it — and advances
`currentMissionKey` the same way a passing `check` does. Deliberately *not* implemented
as faking a pass (e.g. pushing the key into `completed` instead), because that was
exactly the hand-edit workaround the issue described, and it breaks three things at
once: it records a pass that was never earned, the debrief never reaches the player
(so they lose the lesson on top of not proving it), and rank/arc progression — which
SKILL.md derives purely from a `check` completing an arc's last mission, never from
`skip` — would silently inflate, since `list`'s completion count and any future
rank logic can both keep trusting `completed` to mean "actually passed" without
special-casing skips. `skip` prints the mission's debrief anyway (labeled
`SKIPPED_DEBRIEF`, distinct from the real `DEBRIEF:` a pass prints) so the player
still gets the lesson summary even without having earned it, and `list` marks a
skipped mission `[~]`, distinct from both `[ ]` and `[x]`.

`retry <mission-key>` reverses one: removes the key from `skipped` and points
`currentMissionKey` back at it. Missions the player advanced past in the meantime stay
recorded in `completed` — rewinding only affects what mission they're currently
"at," the same field every other command already reads, so nothing downstream needed
new logic to understand a mission being revisited out of order.

## Roadmap

**Built:** Tiers 1–3 are exercised by real missions below; Tier 4's mechanism exists
(`judge.js`) but no current mission uses it — see the note at the end of the Tier 4
section above. Tier 4 is the one tier where the *subject* being graded is genuinely
non-deterministic (writing quality), but the grading *mechanism* stays deterministic
once the judge's structured verdict comes back — no mission anywhere asks the engine to
trust an unstructured "looks good to me."

All 7 arcs below have at least one mission; 20 missions total. The campaign
deliberately spreads "commands" and "extensibility" concepts across difficulty levels
instead of teaching each primitive in one dump — an arc most players reach early
(`tooling`'s `/permissions`) is simpler than one they reach later (shell-tool access on
their own artifacts), even though both are nominally about tools. Tier is orthogonal to
arc — an arc can and does mix tiers. `hooks` and `mcp` were added after the first 5,
slotted in by directory name (`04-hooks` sorts before `04-tooling`; `05-mcp` sorts
after) rather than by renumbering anything already there — every mission built before
them keeps its exact arc, key, and order:

1. **`fundamentals`** — `CLAUDE.md` project memory (Tier 1, "First Contact"), a
   nickname in the game's own per-character run root (Tier 1, "Your Own Name").
   Closed at 2 missions by design — onboarding, not a deep arc.
2. **`commands`** — `/model` (Tier 2, "The Model You Reach For" — confirmed it
   persists to `.claude/settings.json`, but see the verification caveat below);
   `/compact` and `/cost` (ungraded — confirmed no file effect at all; see
   `mission.json`'s `ungraded` field and "Why grading never parses session
   transcripts" above for why these stay informational rather than built on an
   unstable signal); getting back into a specific past session rather than the most
   recent one (Tier 2, "Where You Left Off" — the one mission graded on a real hook,
   and the one that tells the player *not* to use `claude-quest session`, since it
   would hand over the answer). `/add-dir` not yet tried.
3. **`extensibility`** — skill invocation (Tier 2, "Say the Word"), authoring a skill
   from scratch (Tier 2, "First Craft"), then extending that same skill until it
   passes a held-out battery (Tier 3, "Second Craft") — replaced an earlier "Silent
   Door" mission that used a separate pre-fabricated skill instead of the player's
   own.
4. **`subagents`** — author one, no live session needed (Tier 1, "Summon a Helper");
   invoke it explicitly (Tier 2, "Call on Them"); get Claude to delegate to it
   implicitly off its own description (Tier 3, "Their Own Judgment", same shape as
   "Second Craft" but for `.claude/agents/`); a capstone where a subagent granted the
   `Skill` tool invokes the skill from `extensibility` (Tier 2, "Borrowed Craft") —
   confirmed live that this composition actually works.
5. **`hooks`** — author a `PreToolUse` guard from scratch, blocking Bash reads of a
   deliberately boring file (Tier 2, "Ward of Your Own"); fix a pre-seeded hook whose
   `matcher` targets the wrong tool so it silently never fires, correct guard logic
   or not (Tier 3, "The Iron Ward", same shape as "Second Craft"/"Their Own Judgment"
   but the failure mode is a wiring bug, not an ambiguity — no judgment call
   involved anywhere).
6. **`tooling`** — `/permissions` (Tier 2, "The Ledger"); extending the well-wisher
   skill from `extensibility` to actually read/update a file via Bash, scoped down
   with `allowed-tools` on purpose (Tier 2, "Give the Craft Hands"); extending the
   herald subagent from `subagents` the same way, but from the opposite direction —
   it starts scoped to `Skill` only and has to have `Bash` added explicitly before it
   can do anything with a file (Tier 2, "Widen the Herald's Reach"). The two mirror
   each other on purpose: a skill starts with every tool the session has and gets
   scoped down; a subagent starts with only what its `tools` list says and gets
   widened.
7. **`mcp`** — connect a real stdio MCP server via `.mcp.json` (Tier 1, "Open a
   Channel" — the server itself lives permanently in the mission's own directory in
   this repo rather than being copied into the sandbox, since Node resolves
   `node_modules` relative to a script's real disk location, not the process cwd,
   which is what lets it `import` `@modelcontextprotocol/sdk` regardless of where
   the sandbox actually is); invoke its one tool (Tier 2, "Send Word" — graded via
   the same hook-log convention as everywhere else, except this time the *tool's own
   handler* writes the log line directly, not Claude being instructed to run a Bash
   command — more deterministic by construction than every earlier self-logging
   mission, since there's no step where a live session has to choose to comply).

**`mcp` is the project's first real dependency.** Everything before it — the engine,
the test suite — deliberately stayed dependency-free, shelling out to the real
`claude` CLI directly instead of depending on a client library. Hand-rolling the MCP
wire protocol correctly (capability negotiation, JSON-RPC framing) to preserve that
streak was judged the wrong tradeoff for a project that's supposed to teach the real
primitive, not a simplified stand-in of it; `@modelcontextprotocol/sdk` (plus `zod`,
its schema peer) is the officially blessed way to build a real server, live-verified
working end to end.

**Why a custom server instead of an existing public one** (`server-filesystem`,
GitHub, Slack, ...) — considered and rejected:

- **Grading needs to own the proof of invocation.** Every other mission in this
  campaign proves invocation via a side effect it controls (a skill/subagent/hook
  writing a specific log line) rather than trusting what Claude says happened. A
  public server's tool handler is someone else's code; we can't make it write our
  own proof. (A `PreToolUse` hook matched on the tool's full name — `mcp__<server
  >__<tool>` — could in principle verify invocation without needing to own the
  handler at all, sidestepping this specific objection. Not tested live, so treat
  that as a reasoned alternative, not a confirmed one — but it wouldn't resolve the
  next two points either, since those are about the server, not about how
  invocation gets verified.)
- **Anything a public server usefully does needs something external** — GitHub/
  Slack need real accounts and tokens; even a no-auth one like `server-filesystem`
  is normally run via `npx -y @modelcontextprotocol/server-filesystem`, meaning a
  player's first run fetches it live from the npm registry — a real network
  dependency at *play* time. `mcp-server.mjs` lives in this repo's own
  `node_modules`; nothing is fetched when a player reaches this mission.
  Real credentials would also be a first for this campaign — nothing else requires
  an external account to finish a mission.
- **A third party's tool names/schemas can drift under us across their own
  versions.** Our own tool is exactly as stable as this repo's own commits.

The player never manually starts the server process either way — that's just how
Claude Code's stdio MCP transport already works, not something engineered here:
`command`/`args` in `.mcp.json` get spawned automatically at session start,
regardless of whether the config was player-written (Open a Channel) or pre-seeded
by `setup.js` (Send Word). The engine doesn't spawn it either; `check.js` only ever
reads what a real session already produced.

Dropped entirely, at the time (not deferred): an earlier `guardianship` arc, hooks
under a different name and shape, and a `judgment` arc (rubric-graded writing) — no
overlap with the 5-arc set that existed then. Hooks came back later as its own arc,
rebuilt from scratch with lessons the first attempt didn't have yet (the "guard a
boring file, not a destructive/secret-sounding one" fix, `bypassPermissions`) — not a
revival of the old mission, a new one built on the same underlying idea. `judgment`
has not come back; Tier 4 still has no mission using it.

Nothing is currently "not yet built" — all 7 arcs, 20 missions, are complete. Further
content (plugins, a genuinely new Tier 4 subject) would extend this, not fill a gap
in it.

**A verification gap, stated plainly:** every Tier 2/3 mechanism above was confirmed
live except `/model`. Skills and subagents can be triggered headlessly via natural
language (`claude -p "wish me luck"`), so their auto- and explicit-invocation paths
were tested the same way real grading runs them. `/model` has no such equivalent —
it's an interactive-only picker UI with nothing for `-p` to drive, so asking Claude to
"use /model and save it" under `-p` gets inconsistent results (sometimes it writes
`.claude/settings.json` directly, sometimes it correctly explains it can't simulate an
interactive command) — noise from testing an interactive feature the wrong way, not
evidence against the mission. The file-writing mechanism itself is confirmed real (one
clean run produced `{"model": "opus"}` exactly as expected); what's *not* confirmed is
the real interactive `/model` flow end to end, the way a real player would actually
use it, because nothing available can drive a genuine TTY to test it.

## Mission file contract

Each mission is a directory: `missions/<arc>/<mission-id>/`.

```
mission.json   metadata: id, title, arc, tier, order, hints[], artifact (Tier 4 only),
               ungraded (optional, see below)
goal.md        flavor text + walkthrough shown to the player
debrief.md     plain-language recap of the actual Claude Code concept, shown on
               completion — no in-character/fantasy language, see below
setup.js       (optional) seeds the sandbox: files, hook config, locked resources
check.js       Tier 1/2: deterministic check against sandbox state / hook log.
               Signature is check(sandboxDir, { runRoot }) — runRoot is the
               character's persistent directory (see run-root below); almost
               every mission ignores it and checks sandboxDir as normal
tests.json     Tier 3 only: held-out prompt battery + expected-outcome checks
rubric.json    Tier 4 only: judged criteria (id + description) + passThreshold
<assets>       (optional) files setup.js copies into the sandbox — e.g. the hook
               script "Where You Left Off" registers, kept as a real reviewable
               file here rather than generated from a string at setup time
```

An `mcp-server.mjs` is a different case from the assets above — it stays put in the
mission's own directory and is never copied into the sandbox. `.mcp.json` references
it by absolute path instead, which is what lets it `import` `@modelcontextprotocol/sdk`
from this repo's own `node_modules` (Node resolves `node_modules` relative to a
script's real disk location, not the process cwd) regardless of where any given
sandbox happens to live. See the `mcp` arc in the Roadmap below.

`mission.json`'s `"ungraded": true` skips `check.js`/tier grading entirely and always
passes (see `gradeMission.js`) — for the small number of missions teaching a real
built-in command with no file-level (or otherwise reliably checkable) effect at all,
like `/compact` or `/cost`. The point of one of these is trying the command and
reading the debrief, not clearing a gate that doesn't correspond to anything real.

`debrief.md` is the one piece of player-facing mission content that's deliberately
*not* in-character — the game master relays it verbatim in a plainly separate block
(see `skills/claude-quest/SKILL.md`'s `check` handling) so what was actually learned
stays legible independent of the fantasy framing. `check` prints it (from
`mission.debrief`, loaded by `missionLoader.js`) as part of its own output on
`MISSION_STATUS: complete`, the same "relay real engine output, never invent it"
discipline every other piece of mission content follows.

`missions/ranks.json` sits alongside the arc directories, not inside any one mission —
see [Ranks and sections](#ranks-and-sections).

`hints` is an ordered array of strings, revealed one at a time (least to most direct)
on request — see [Player experience](#player-experience).

`setup.js`, `check.js`, and the test-battery runner are the direct analogs of GameShell's
`static.sh`, `check.sh`, and `test.sh` — same responsibilities, expressed as Node modules
instead of POSIX shell so the engine runs natively on Windows/macOS/Linux and can shell
out to the real `claude` CLI directly.

## Testing the engine itself

There's a difference between a mission grading a *player* (its own `check.js`/
`tests.json`, covered above) and something verifying that the *engine and campaign
content* still work as new missions and engine changes land. Before this, that
verification was entirely manual — a throwaway script against a temp sandbox, checked
by eye, then discarded. Nothing caught a regression in an older mission unless someone
happened to manually replay it.

Two layers, both `node:test`, no new dependencies (matching how `runTestBattery`/
`judge.js` already shell out to `claude` directly rather than depending on a client
library):

**`npm test`** (`test/unit/`) — fast, deterministic, zero API calls. Every mission's
`check.js` is tested directly against a synthetic sandbox built with plain `mkdirSync`/
`writeFileSync` (never through `setup.js` or a live session) — both the passing shape
and the specific ways it should fail. Core engine modules (`missionLoader.js`,
`save.js`, `provision.js`, `claudeSessions.js`, `hookLog.js`, `gradeMission.js`'s
dispatch/`ungraded` logic) are covered the same way. One test is pinned to a
live-verified regression case rather than a made-up example:
`claudeSessions.test.js`'s dot-in-path case reproduces the exact directory name a real
`claude -p` session produced during PR #15's review — the specific edge case an
earlier, wrong implementation of the same algorithm missed.

**`npm run test:live`** (`test/live/`) — slow, costs real tokens, spawns an actual
`claude` process per test. Covers the mechanisms `check.js` alone can't prove: does a
skill/subagent still actually fire (explicit and auto-invocation), does a held-out
battery still pass against a correctly-worded description, does a subagent still
compose with a skill, does the `SessionStart` hook still fire and still distinguish
`startup` from `resume`. Each test covers the *fixed*, passing state for its mission —
the broken-state failure mode was already established once, carefully, while building
that mission (see the arc-by-arc notes above); the ongoing value of a live suite is
confirming the mechanism still works against whatever `claude` version is currently
installed, not re-relitigating each mission's design. Requires a working,
already-authenticated `claude` on PATH — the same requirement every mission's own
live grading already has — which is exactly why this never runs as part of default
CI: it's for a maintainer to run before trusting something that touches
live-invocation behavior, the same discipline this project already held itself to by
hand before any of this existed.

**A real bug this suite caught in itself, not in the missions:** `withLiveSandbox`'s
`try { return fn(dir); } finally { rmSync(dir, ...) }` doesn't `await fn(dir)` before
cleanup runs — a bare `return` of a still-pending promise lets `finally` fire
immediately, synchronously, deleting the sandbox while `provision()`'s async
`setup()` call is still in flight. Every mission whose `setup.js` happens to call
`mkdirSync(..., { recursive: true })` before its first write self-healed from this
completely silently (the recursive mkdir recreates the deleted directory as a side
effect); the two hooks/mcp missions built after this suite existed were the first
whose `setup.js` goes straight to `writeFileSync` with nothing to recreate the
directory, and they failed with a bare `ENOENT` that had nothing to do with either
mission's own logic. Fixed with `return await fn(dir)`. Worth recording because the
first hypothesis — file-level test-runner concurrency racing on Windows — was wrong
and cost real time chasing before the actual cause turned up. `--test-concurrency=1`
was added while chasing that wrong hypothesis, then removed once the real fix
(confirmed clean, twice, under `--test-concurrency=1`) turned out to be a per-call
correctness bug with nothing to do with concurrency — if a future run turns up a
genuine concurrency issue after all, that's new evidence, not something this note
already ruled out.
