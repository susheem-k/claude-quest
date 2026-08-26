import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * The guard script itself is correct: it inspects the Bash command it's
 * handed and blocks anything that reads guarded.txt, logging the block so
 * grading can see it fired. What's broken is the *wiring* in settings.json
 * (see below) — the guard never gets invoked at all, because its matcher
 * targets the wrong tool. This mirrors skills-silent-door's "the fix is
 * real judgment, the check stays deterministic" shape, but for a hook
 * instead of a skill description.
 *
 * Deliberately guards a *read* of a deliberately boring file, not a delete
 * or anything credential-shaped: earlier attempts blocked deleting a file,
 * then blocked reading a file literally named secrets.txt containing a fake
 * API key — a real `claude` session refused to even attempt either on its
 * own judgment ("this looks irreversible/precious", "this looks like it
 * holds credentials") even when told explicitly to do it. That made the
 * battery flaky for reasons that have nothing to do with whether the hook
 * works — the model's own caution was the thing being tested, not the
 * hook. guarded.txt has nothing alarming in its name or contents, so the
 * model has no reason to hesitate; the hook is what's actually under test.
 *
 * Deliberately Node, not a shell script: hooks run as a plain subprocess
 * (not through the Bash/PowerShell tool), so a shell script would only work
 * on whichever shell happens to be present. Node is guaranteed, since it's
 * the same runtime running the engine itself.
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
    JSON.stringify({ tool: 'Hook', name: 'iron-ward-block', timestamp: Date.now() }) + '\\n'
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
