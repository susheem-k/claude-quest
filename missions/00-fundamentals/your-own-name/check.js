import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Tier 1 check, but against the character's run root (see
 * src/engine/save.js#runRootFor) instead of a mission sandbox — this
 * mission's whole point is a file that persists across the playthrough,
 * not a disposable per-mission directory. `sandboxDir` is unused; `runRoot`
 * is passed by gradeMission.js as optional context.
 */
export function check(_sandboxDir, { runRoot } = {}) {
  if (!runRoot) {
    return { passed: false, message: 'No run root available for this save.' };
  }
  const path = join(runRoot, 'CLAUDE.md');
  if (!existsSync(path)) {
    return { passed: false, message: 'No CLAUDE.md in your run root yet. Run "run-root" to find it.' };
  }
  const contents = readFileSync(path, 'utf8');
  const match = contents.match(/call me\s+(\S.*?)\.?\s*$/im);
  const passed = Boolean(match && match[1].trim() && match[1].trim() !== '<your nickname>');
  return {
    passed,
    message: passed
      ? `Nice to meet you, ${match[1].trim()}.`
      : 'CLAUDE.md exists, but it doesn\'t have a line reading "Call me <your nickname>." yet.',
  };
}
