# claude-quest

An in-terminal RPG for learning the Claude Code CLI, zero to hero.

Inspired by [GameShell](https://github.com/phyver/GameShell) — a game that teaches Unix
shell commands by dropping you into a real shell wrapped in a themed fake filesystem, and
grading your progress by checking real shell/filesystem state instead of quizzing you.
`claude-quest` applies the same philosophy to Claude Code itself: missions live in real
sandbox directories, and progress is checked by inspecting what you actually did — config
files you wrote, hooks that fired, tool calls that happened — rather than asking you to
self-report.

Full design rationale is in [`docs/DESIGN.md`](docs/DESIGN.md).

## Install

Inside any `claude` session:

```
/plugin marketplace add susheem-k/claude-quest
/plugin install claude-quest@claude-quest
```

That's it — `claude-quest` is now available from any project, in any `claude`
session, on this machine. Progress is stored in the plugin's own data directory
(`$CLAUDE_PLUGIN_DATA`), so it doesn't matter which project you're in when you play.

<details>
<summary>Prefer not to install it? Run it from a manual clone instead.</summary>

```
git clone https://github.com/susheem-k/claude-quest
cd claude-quest
claude
```

Progress is stored in this repo's own working directory in that case
(`.claude-quest/`, gitignored).
</details>

## How to play

The whole game runs inside a real `claude` session — there's no separate app to
launch. Say something like "let's play claude quest" (or type `/claude-quest`).
Claude takes it from there as game master: it'll ask for a character name on your
first run, narrate the current mission, and relay real pass/fail results from the
engine as you play. See [`skills/claude-quest/SKILL.md`](skills/claude-quest/SKILL.md)
for exactly what it's instructed to do.

## Status

Core loop is playable: character creation, save/resume across multiple characters,
per-mission hints, sandbox provisioning, and grading for all four tiers — including
Tier 4's rubric-graded judge calls. Only 4 example missions exist so far (one per
tier) — see [Roadmap](docs/DESIGN.md#roadmap) and the repo's issues for what's next.

## Quick orientation

- `docs/DESIGN.md` — the actual design doc: mission tiers, grading mechanism, mission
  file contract, anti-flakiness guardrails, arc outline, roadmap.
- `.claude-plugin/` — the plugin manifest and single-plugin marketplace that make
  `/plugin install` work.
- `skills/claude-quest/SKILL.md` — the game master. This is what makes the
  experience live entirely inside the `claude` CLI.
- `src/engine/` — the engine: loads missions, manages save games, provisions
  sandboxes, and runs grading (Tier 1/2 `check.js`, Tier 3 test battery).
- `src/bin/claude-quest.js` — the command surface the skill calls via Bash. Not
  meant to be run directly by a player.
- `missions/<arc>/<mission>/` — one directory per mission. See `docs/DESIGN.md` for the
  file contract each mission directory follows.

## Requirements

- Node.js 18+
- The `claude` CLI installed and authenticated under your own account (live-session
  missions run against *your* Claude Code usage, not the project's — the engine never
  makes API calls on your behalf beyond what you'd run yourself)

## License

MIT — see [LICENSE](LICENSE). This is an original implementation; it borrows GameShell's
architectural ideas (not its code), which remains GPLv3 in its own repo.
