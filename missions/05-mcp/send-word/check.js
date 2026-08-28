import { wasInvoked } from '../../../src/engine/hookLog.js';
import { hookLogPath } from '../../../src/engine/sandbox.js';

/**
 * Tier 2 check: reads hook telemetry — but this time it's the MCP tool's
 * own handler that wrote the line, not Claude being instructed to run a
 * Bash command. Same log, same reader, a more direct source.
 */
export function check(sandboxDir) {
  const passed = wasInvoked(hookLogPath(sandboxDir), { tool: 'MCP', name: 'send_word' });
  return {
    passed,
    message: passed
      ? 'send_word fired. The beacon itself logged it, regardless of what Claude said.'
      : 'No record of send_word firing yet. Open a session here and ask for a message to be sent.',
  };
}
