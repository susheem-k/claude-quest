import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * The guard script itself is correct: it inspects the Bash command it's
 * handed and blocks anything that reads guarded.txt, logging the block so
 * grading can see it fired. What's broken is the *wiring* in settings.json
 * (see below) — the guard never gets invoked at all, because its matcher
 * targets the wrong tool. Mirrors Second Craft / Their Own Judgment's
 * shape: the fix is real judgment, the check stays deterministic.
 *
 * Deliberately a read of a deliberately boring file, not anything
 * credential- or destructive-shaped: a live session sometimes refuses a
 * delete, or a read of a file that even sounds like it holds secrets, on
 * its own judgment — confirmed live — even when told explicitly to do it.
 * That made an earlier version of this mission flaky for reasons that had
 * nothing to do with whether the hook worked. guarded.txt has nothing
 * alarming in its name or contents, so the model has no reason to
 * hesitate; the hook is what's actually under test.
 */
const GUARD_SCRIPT = `const chunks = [];
process.stdin.on('data', (c) => chunks.push(c));
process.stdin.on('end', () => {
  let input;
  try {
    input = JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    process.exit(0);
  }

  const command = input?.tool_input?.command ?? '';
  const touchesGuarded = /guarded\\.txt/i.test(command);
  if (!touchesGuarded) process.exit(0);

  const fs = require('node:fs');
  const path = require('node:path');
  const logDir = path.join(input.cwd, '.claude-quest');
  fs.mkdirSync(logDir, { recursive: true });
  fs.appendFileSync(
    path.join(logDir, 'hook.log'),
    JSON.stringify({ tool: 'Hook', name: 'iron-ward-block' }) + '\\n'
  );
  process.stderr.write('guarded.txt is warded. That command is blocked.\\n');
  process.exit(2);
});
`;

export function setup(sandboxDir) {
  mkdirSync(join(sandboxDir, '.claude'), { recursive: true });
  mkdirSync(join(sandboxDir, '.claude-quest'), { recursive: true });

  writeFileSync(join(sandboxDir, '.claude-quest', 'guard.js'), GUARD_SCRIPT);

  writeFileSync(join(sandboxDir, 'guarded.txt'), 'status: nominal\nlast_check: ok\n');
  writeFileSync(join(sandboxDir, 'notes.txt'), 'Meeting moved to Thursday. Bring the printouts.\n');

  // Broken: the matcher targets "Write", so this PreToolUse hook never fires
  // for Bash commands at all — the guard script above is never invoked,
  // correct or not. The fix is changing "Write" to "Bash".
  const settings = {
    hooks: {
      PreToolUse: [
        {
          matcher: 'Write',
          hooks: [
            {
              type: 'command',
              command: `node "${join(sandboxDir, '.claude-quest', 'guard.js')}"`,
            },
          ],
        },
      ],
    },
  };
  writeFileSync(join(sandboxDir, '.claude', 'settings.json'), JSON.stringify(settings, null, 2));
}
