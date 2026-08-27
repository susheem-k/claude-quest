import { appendFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

/**
 * SessionStart hook for the "Where You Left Off" mission. Copied into the
 * sandbox by setup.js and registered in that sandbox's .claude/settings.json.
 *
 * Writes one line per session start, in the shape src/engine/hookLog.js already
 * reads ({ tool, name }): `name` carries the hook payload's `source` —
 * "startup" for a new session, "resume" for a re-entered one — and `session`
 * rides along for check.js. Parsing it needed no engine change.
 *
 * The log path is resolved relative to this file rather than the process cwd. A
 * hook runs with cwd set to the project directory, but the log has to land next
 * to this script regardless of where the player launched claude from.
 */
const LOG = fileURLToPath(new URL('./hook.log', import.meta.url));

let raw = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => {
  raw += chunk;
});
process.stdin.on('end', () => {
  try {
    const payload = JSON.parse(raw);
    if (payload.hook_event_name !== 'SessionStart') return;
    const line = JSON.stringify({
      tool: 'SessionStart',
      name: payload.source,
      session: payload.session_id,
    });
    appendFileSync(LOG, `${line}\n`);
  } catch {
    // Nothing to record from a payload that doesn't parse, and throwing here
    // would surface as hook noise in the player's own session.
  }
});
