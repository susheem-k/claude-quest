import { wasInvoked } from '../../../src/engine/hookLog.js';
import { hookLogPath } from '../../../src/engine/sandbox.js';

/**
 * Tier 2 check: both primitives have to have actually fired — the herald
 * subagent, and the well-wisher skill it's supposed to reach for. Either one
 * missing means the composition didn't really happen.
 */
export function check(sandboxDir) {
  const logPath = hookLogPath(sandboxDir);
  const heraldFired = wasInvoked(logPath, { tool: 'Agent', name: 'herald' });
  const skillFired = wasInvoked(logPath, { tool: 'Skill', name: 'well-wisher' });
  const passed = heraldFired && skillFired;

  if (passed) {
    return { passed: true, message: 'herald and well-wisher both fired — the subagent actually reached for the skill.' };
  }
  const missing = [!heraldFired && 'herald', !skillFired && 'well-wisher'].filter(Boolean);
  return { passed: false, message: `No record of ${missing.join(' and ')} firing yet. Ask for the herald by name.` };
}
