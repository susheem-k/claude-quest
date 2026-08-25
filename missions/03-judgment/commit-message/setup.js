import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

export function setup(sandboxDir) {
  writeFileSync(
    join(sandboxDir, 'CHANGE_SUMMARY.md'),
    `# What changed

- \`src/auth/session.js\`: session tokens used to never expire. They now expire
  after 15 minutes of inactivity — \`isValid()\` checks a new \`lastActiveAt\`
  timestamp against that window.
- \`src/auth/session.test.js\`: added a test covering the new expiry behavior.

This closes out a security review finding: idle sessions were staying valid
indefinitely, which meant a stolen session token worked forever.
`
  );
}
