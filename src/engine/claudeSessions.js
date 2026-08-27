import { statSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

/**
 * Locating a Claude Code session transcript for a given working directory.
 *
 * This is deliberately *not* the thing docs/DESIGN.md rules out. That ban is
 * on parsing a transcript's contents — the entry format is internal and can
 * change on any release. Nothing here opens a transcript: it only asks whether
 * the file for a session id we minted ourselves exists yet. Filename and
 * directory layout are what `claude --resume` itself depends on, so they're a
 * different stability class from the JSONL schema.
 *
 * Borrowed from the same problem solved in Quil (internal/claudesessions),
 * where the directory-name algorithm below was transcribed out of the claude
 * binary after an earlier approximation cost a real incident.
 */

/** Claude Code's own override for where it stores everything, projects/ included. */
const CONFIG_DIR_ENV = 'CLAUDE_CONFIG_DIR';

/**
 * Mirrors how Claude Code names a project's transcript directory under
 * ~/.claude/projects/. Straight from the claude binary:
 *
 *   t = cwd.replace(/[^a-zA-Z0-9]/g, "-")
 *   if (t.length <= 200) return t
 *   return t.slice(0, 200) + "-" + base36(abs(h))   // h = Java-31x hash of cwd
 *
 * Reproduced rather than approximated on purpose. Getting it wrong fails
 * *quietly* — you probe a directory that doesn't exist, conclude the session
 * isn't there, and hand back a start command for a session that's already
 * running. Note the regex replaces every non-alphanumeric, dots included; an
 * earlier version of this in Quil missed '.' and every path containing one
 * silently resolved to the wrong directory.
 */
export function escapeCwd(cwd) {
  const escaped = cwd.replace(/[^a-zA-Z0-9]/g, '-');
  if (escaped.length <= 200) return escaped;
  // charCodeAt matches the binary's per-UTF-16-code-unit hash, and `| 0`
  // reproduces its int32 wraparound. Hashed over the *original* cwd, not the
  // dashified string.
  let h = 0;
  for (let i = 0; i < cwd.length; i += 1) h = ((h << 5) - h + cwd.charCodeAt(i)) | 0;
  return `${escaped.slice(0, 200)}-${Math.abs(h).toString(36)}`;
}

/** Claude Code's config directory: $CLAUDE_CONFIG_DIR if set, else ~/.claude. */
export function configDir() {
  const override = process.env[CONFIG_DIR_ENV]?.trim();
  if (override) return override;
  return join(homedir(), '.claude');
}

/** Where Claude would write the transcript for `sessionId` started in `cwd`. */
export function transcriptPath(cwd, sessionId) {
  return join(configDir(), 'projects', escapeCwd(cwd), `${sessionId}.jsonl`);
}

/**
 * True once the session has actually been started and persisted. False is the
 * honest answer for a session the player opened but quit out of before any
 * exchange landed — Claude writes the transcript on the first exchange, not on
 * launch, so "not there yet" and "never started" look the same here, and both
 * want the same command.
 */
export function transcriptExists(cwd, sessionId) {
  // Size, not just existence: Claude can leave a zero-byte transcript behind,
  // and `--resume` on one fails with "no conversation found". An empty file
  // means the same thing as no file here, so it's answered the same way.
  const stat = statSync(transcriptPath(cwd, sessionId), { throwIfNoEntry: false });
  return Boolean(stat?.isFile() && stat.size > 0);
}
