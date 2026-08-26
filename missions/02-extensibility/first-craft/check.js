import { wasInvoked } from '../../../src/engine/hookLog.js';
import { hookLogPath } from '../../../src/engine/sandbox.js';

/** Tier 2 check: reads hook telemetry, never the model's output. */
export function check(sandboxDir) {
  const passed = wasInvoked(hookLogPath(sandboxDir), { tool: 'Skill', name: 'well-wisher' });
  return {
    passed,
    message: passed
      ? 'well-wisher fired. The hook log saw it, regardless of what Claude said.'
      : 'No record of well-wisher firing yet. Write the skill, then open a session here and try /well-wisher.',
  };
}
