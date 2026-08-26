import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

/** Tier 2 check: reads the project settings file /model writes to. */
export function check(sandboxDir) {
  const path = join(sandboxDir, '.claude', 'settings.json');
  if (!existsSync(path)) {
    return { passed: false, message: 'No .claude/settings.json yet — open a session here and use /model.' };
  }

  let settings;
  try {
    settings = JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return { passed: false, message: '.claude/settings.json exists but isn\'t valid JSON.' };
  }

  const passed = typeof settings.model === 'string' && /opus/i.test(settings.model);
  return {
    passed,
    message: passed
      ? `Found model: ${settings.model} in settings.json — this project defaults to Opus now.`
      : 'settings.json doesn\'t have model set to Opus yet.',
  };
}
