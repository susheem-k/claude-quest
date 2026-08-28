import { wasInvoked } from '../../../src/engine/hookLog.js';
import { hookLogPath } from '../../../src/engine/sandbox.js';

/** Tier 2 check: reads hook telemetry, never the model's output. */
export function check(sandboxDir) {
  const passed = wasInvoked(hookLogPath(sandboxDir), { tool: 'Hook', name: 'ward-of-your-own' });
  return {
    passed,
    message: passed
      ? 'The ward fired. The hook log saw it, regardless of what Claude said.'
      : 'No record of the ward firing yet. Build the hook, then ask Claude to run `cat diary.txt` via Bash.',
  };
}
