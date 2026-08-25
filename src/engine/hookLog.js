import { readFileSync, existsSync } from 'node:fs';

/**
 * Tier 2/3 missions seed their sandbox with a skill whose own body logs its
 * invocation here as one of its instructed steps (see src/engine/sandbox.js
 * and docs/DESIGN.md#tier-2--invocation). The engine never inspects model
 * conversational output directly — only this file, a real independently
 * checkable side effect.
 *
 * Expected line shape:
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
