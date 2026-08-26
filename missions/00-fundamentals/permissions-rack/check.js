import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const EXPECTED_RULE = 'Bash(npm test:*)';

/**
 * Tier 2 check: reads the project-local settings file /permissions writes
 * to (.claude/settings.local.json — the "you, this project" scope, per
 * docs.claude.com/en/settings), never the model's own output.
 */
export function check(sandboxDir) {
  const path = join(sandboxDir, '.claude', 'settings.local.json');
  if (!existsSync(path)) {
    return {
      passed: false,
      message: 'No .claude/settings.local.json yet — open a session here and use /permissions.',
    };
  }

  let settings;
  try {
    settings = JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return { passed: false, message: '.claude/settings.local.json exists but isn\'t valid JSON.' };
  }

  const allow = settings.permissions?.allow ?? [];
  const passed = allow.includes(EXPECTED_RULE);
  return {
    passed,
    message: passed
      ? `Found ${EXPECTED_RULE} in permissions.allow — Claude Code won't ask about that again.`
      : `permissions.allow doesn't include ${EXPECTED_RULE} yet.`,
  };
}
