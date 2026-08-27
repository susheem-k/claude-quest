import { readHookLog } from '../../../src/engine/hookLog.js';
import { hookLogPath } from '../../../src/engine/sandbox.js';

/**
 * Tier 2 check: reads the SessionStart log this mission's setup.js seeded.
 *
 * Grades which session the player ended up in, never which flag they typed.
 * `--continue` and `--resume` both report `source: "resume"` — confirmed live,
 * so there is nothing in the payload that distinguishes them. That's the right
 * thing to grade anyway: the lesson is about where you land, not what you typed
 * to get there.
 */
export function check(sandboxDir) {
  const events = readHookLog(hookLogPath(sandboxDir)).filter((e) => e.tool === 'SessionStart');
  const startups = events.filter((e) => e.name === 'startup');
  const distinct = new Set(startups.map((e) => e.session));

  if (distinct.size === 0) {
    return { passed: false, message: 'No sessions have been opened in this sandbox yet.' };
  }
  if (distinct.size < 2) {
    return {
      passed: false,
      message:
        'Only one session has been started here so far — there has to be a second one before choosing between them means anything.',
    };
  }

  const resumes = events.filter((e) => e.name === 'resume');
  if (resumes.length === 0) {
    return {
      passed: false,
      message: `${distinct.size} sessions have been started here, but none of them has been re-entered yet.`,
    };
  }

  const first = startups[0].session;
  const landed = resumes[resumes.length - 1].session;
  const passed = landed === first;
  return {
    passed,
    message: passed
      ? 'You went back into the first session specifically, past a newer one sitting in the same directory. That is the whole distinction.'
      : 'You got back into a session, but not the first one — that is what `--continue` does: it takes the most recent in the directory, without asking which you meant.',
  };
}
