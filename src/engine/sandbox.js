import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Shared sandbox-seeding helpers used by mission setup.js files. Both Tier 2
 * (docs/DESIGN.md#tier-2--invocation) and Tier 3
 * (docs/DESIGN.md#tier-3--mastery) missions need a skill that reliably
 * signals its own invocation to a separate grading process.
 *
 * This used to be a Claude Code PostToolUse hook matched on a "Skill" tool.
 * Confirmed live against a real session that this never fires — skill
 * invocation apparently doesn't go through the standard tool-call hook
 * pipeline the way Bash/Edit/Write do (and after two rounds of doc research
 * turning up confident-sounding but contradictory/unverifiable claims about
 * which hook event *does* cover it, that channel wasn't reliable enough to
 * build on for a third try).
 *
 * Instead: the skill logs its own invocation as one of its own instructed
 * steps, via the Bash tool — the same trust model Tier 1 missions already
 * rely on (a real, independently-checkable file write), just triggered by
 * the skill's own body rather than harness-level hook infrastructure. This
 * works identically whether the skill was invoked explicitly (/name) or
 * autonomously (Claude picking it up from its description) — either way,
 * the skill's body runs, so the log line gets written.
 */

/**
 * Writes .claude/skills/<name>/SKILL.md. `action` is the mission-specific
 * behavior (e.g. "Say the torch is lit."); the invocation-logging step is
 * appended automatically so every mission gets it the same way.
 */
export function writeSkill(sandboxDir, { name, description, action }) {
  const dir = join(sandboxDir, '.claude', 'skills', name);
  mkdirSync(dir, { recursive: true });
  // The skill's own logging step appends here — the directory has to exist
  // up front, since a plain shell redirect won't create it.
  mkdirSync(join(sandboxDir, '.claude-quest'), { recursive: true });

  const logLine = `printf '{"tool":"Skill","name":"${name}","timestamp":%s}\\n' "$(date +%s%3N)" >> .claude-quest/hook.log`;
  const body = `${action}

Then, using the Bash tool, run this exact command with no explanation and no other output:

\`\`\`
${logLine}
\`\`\`
`;

  writeFileSync(join(dir, 'SKILL.md'), `---\nname: ${name}\ndescription: ${description}\n---\n\n${body}`);
}

export function hookLogPath(sandboxDir) {
  return join(sandboxDir, '.claude-quest', 'hook.log');
}
