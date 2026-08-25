import { readFileSync, existsSync } from 'node:fs';

/**
 * Tier 2/3 missions seed their sandbox with a PostToolUse hook (see
 * docs/DESIGN.md#tier-2--invocation) that appends one JSON line per matched
 * tool call to this log. The engine never inspects model output directly —
 * only this telemetry.
 *
 * Expected line shape (written by the hook script the mission's setup.js
 * installs into the sandbox's .claude/settings.json):
 *   { "tool": "Skill", "name": "my-skill", "timestamp": 1234567890 }
 */
export function readHookLog(logPath) {
  if (!existsSync(logPath)) return [];
  return readFileSync(logPath, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

/** True if any logged event matches the given tool + name. */
export function wasInvoked(logPath, { tool, name }) {
  return readHookLog(logPath).some(
    (event) => event.tool === tool && (!name || event.name === name)
  );
}
