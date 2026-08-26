import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

export function setup(sandboxDir) {
  writeFileSync(
    join(sandboxDir, 'TASK_BRIEF.md'),
    `# Task brief

The public API's \`/login\` endpoint has no rate limiting — a single client can
attempt unlimited password guesses. Add rate limiting so a given IP is capped
at 5 failed attempts per 15 minutes, returning 429 after that.

Relevant files:

- \`src/api/routes/login.js\` — the route handler itself
- \`src/api/middleware/\` — existing middleware lives here; rate limiting
  should probably live here as its own middleware, not be inlined into the
  route
- \`src/api/routes/login.test.js\` — existing tests for the route

Constraints:

- Out of scope: \`/signup\` has the same theoretical issue but isn't part of
  this task — a separate ticket covers it. Don't touch it.
- No new external dependency. There's already a small in-memory counter
  utility at \`src/lib/rateCounter.js\`, used elsewhere in the codebase for a
  similar purpose.
`
  );
}
