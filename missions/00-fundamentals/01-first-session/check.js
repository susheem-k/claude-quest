import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

/** Tier 1 check: pure filesystem inspection, no live session involved. */
export function check(sandboxDir) {
  const path = join(sandboxDir, 'CLAUDE.md');
  if (!existsSync(path)) {
    return { passed: false, message: 'No CLAUDE.md in the project root yet.' };
  }
  const contents = readFileSync(path, 'utf8');
  const passed = /npm test/i.test(contents);
  return {
    passed,
    message: passed
      ? 'CLAUDE.md records how to run the tests. Claude Code will know next time.'
      : 'CLAUDE.md exists, but it doesn\'t mention how to run the tests (npm test).',
  };
}
