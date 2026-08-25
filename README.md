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

## Status

Early scaffolding. The mission contract and grading model are designed and documented;
the engine (`src/engine`) and most missions are stubs. See
[Roadmap](docs/DESIGN.md#roadmap) for what's built vs. planned.

## Quick orientation

- `docs/DESIGN.md` — the actual design doc: mission tiers, grading mechanism, mission
  file contract, anti-flakiness guardrails, arc outline, roadmap.
- `src/engine/` — the CLI engine that loads missions, runs checks, and drives the
  test-prompt battery for Tier 3 missions.
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
