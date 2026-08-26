import { wasInvoked } from '../../../src/engine/hookLog.js';
import { hookLogPath } from '../../../src/engine/sandbox.js';

/** Tier 2 check: reads hook telemetry, never the model's output. */
export function check(sandboxDir) {
  const passed = wasInvoked(hookLogPath(sandboxDir), { tool: 'Agent', name: 'town-crier' });
  return {
    passed,
    message: passed
      ? 'town-crier fired. The hook log saw it, regardless of what Claude said.'
      : 'No record of town-crier firing yet. Open a session here and ask for it by name.',
  };
}
