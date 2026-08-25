import { wasInvoked } from '../../../src/engine/hookLog.js';
import { hookLogPath } from '../../../src/engine/sandbox.js';

/** Tier 2 check: reads hook telemetry, never the model's output. */
export function check(sandboxDir) {
  const passed = wasInvoked(hookLogPath(sandboxDir), { tool: 'Skill', name: 'torch-lighter' });
  return {
    passed,
    message: passed
      ? 'torch-lighter fired. The hook log saw it, regardless of what Claude said.'
      : 'No record of torch-lighter firing yet. Open a session here and try /torch-lighter.',
  };
}
