import { copyFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Seeds the sandbox with a SessionStart hook that records every session opened
 * here. That log is what lets check.js tell "started another new session" from
 * "went back into an older one" without ever reading a transcript.
 *
 * This is the campaign's first mission graded on a real Claude Code hook.
 * docs/DESIGN.md records that a PostToolUse hook matched on `Skill` never fires
 * — that finding is specific to skill invocation. SessionStart is a different
 * event, and it was confirmed live before this mission was built: it fires even
 * under `claude -p`, and its payload's `source` field reports "startup" for a
 * new session and "resume" for a re-entered one.
 */
export function setup(sandboxDir) {
  const questDir = join(sandboxDir, '.claude-quest');
  mkdirSync(questDir, { recursive: true });
  mkdirSync(join(sandboxDir, '.claude'), { recursive: true });

  // Shipped as a file next to this one and copied in, rather than generated as
  // a string here — the hook is real code, and it stays readable and reviewable
  // in the repo that way.
  const hookScript = join(questDir, 'session-hook.mjs');
  copyFileSync(fileURLToPath(new URL('./session-hook.mjs', import.meta.url)), hookScript);

  // A hook command is handed to a shell, and the sandbox lives under the
  // player's home directory, which can contain spaces — hence the quoting.
  // Forward slashes rather than the platform separator, so one spelling works
  // on Windows as well as macOS/Linux.
  const settings = {
    hooks: {
      SessionStart: [
        { hooks: [{ type: 'command', command: `node "${hookScript.replace(/\\/g, '/')}"` }] },
      ],
    },
  };
  writeFileSync(join(sandboxDir, '.claude', 'settings.json'), `${JSON.stringify(settings, null, 2)}\n`);
}
