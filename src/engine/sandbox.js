import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Shared sandbox-seeding helpers used by mission setup.js files. Both Tier 2
 * (docs/DESIGN.md#tier-2--invocation) and Tier 3
 * (docs/DESIGN.md#tier-3--mastery) missions need the same hook-logging
 * scaffolding; only what's inside the skill differs.
 */

/** Writes .claude/skills/<name>/SKILL.md. */
export function writeSkill(sandboxDir, { name, description, body }) {
  const dir = join(sandboxDir, '.claude', 'skills', name);
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    join(dir, 'SKILL.md'),
    `---\nname: ${name}\ndescription: ${description}\n---\n\n${body}\n`
  );
}

/**
 * Installs the PostToolUse hook + logger script that Tier 2/3 grading reads
 * via src/engine/hookLog.js. Idempotent per-sandbox; call once in setup.js.
 *
 * NOTE: the stdin JSON field names (tool_name, tool_input) are asserted from
 * the hooks docs but not yet verified against a live `claude` run — treat
 * log-hook.js as a first draft.
 */
export function seedHookLogging(sandboxDir, { matcher = 'Skill' } = {}) {
  const questDir = join(sandboxDir, '.claude-quest');
  mkdirSync(questDir, { recursive: true });

  const logPath = join(questDir, 'hook.log').replace(/\\/g, '\\\\');
  writeFileSync(
    join(questDir, 'log-hook.js'),
    `#!/usr/bin/env node
import { appendFileSync } from 'node:fs';

let input = '';
process.stdin.on('data', (chunk) => { input += chunk; });
process.stdin.on('end', () => {
  let event;
  try {
    event = JSON.parse(input);
  } catch {
    process.exit(0);
  }
  const line = JSON.stringify({
    tool: event.tool_name,
    name: event.tool_input?.name ?? event.tool_input?.skill,
    timestamp: Date.now(),
  });
  appendFileSync('${logPath}', line + '\\n');
});
`
  );

  mkdirSync(join(sandboxDir, '.claude'), { recursive: true });
  writeFileSync(
    join(sandboxDir, '.claude', 'settings.json'),
    JSON.stringify(
      {
        hooks: {
          PostToolUse: [
            {
              matcher,
              hooks: [{ type: 'command', command: 'node .claude-quest/log-hook.js' }],
            },
          ],
        },
      },
      null,
      2
    )
  );
}

export function hookLogPath(sandboxDir) {
  return join(sandboxDir, '.claude-quest', 'hook.log');
}
