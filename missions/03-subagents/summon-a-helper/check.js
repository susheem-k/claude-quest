import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const REQUIRED_LOG_LINE = 'printf \'{"tool":"Agent","name":"town-crier"}\\n\' >> .claude-quest/hook.log';

/**
 * Tier 1 check: pure filesystem inspection, no live session involved — this
 * mission is about the file being structured correctly, not about anyone
 * having called on the subagent yet (that's the next mission).
 */
export function check(sandboxDir) {
  const path = join(sandboxDir, '.claude', 'agents', 'town-crier.md');
  if (!existsSync(path)) {
    return { passed: false, message: 'No .claude/agents/town-crier.md yet.' };
  }

  const contents = readFileSync(path, 'utf8');
  const frontmatter = contents.match(/^---\n([\s\S]*?)\n---/);
  if (!frontmatter) {
    return { passed: false, message: 'town-crier.md exists, but has no --- frontmatter block.' };
  }
  const fm = frontmatter[1];

  const hasName = /name:\s*town-crier\s*$/im.test(fm);
  const descMatch = fm.match(/description:\s*(.+)$/im);
  const hasDescription = Boolean(descMatch && descMatch[1].trim().length > 5);
  const hasBashTool = /tools:\s*.*\bBash\b/im.test(fm);
  const hasLogLine = contents.includes(REQUIRED_LOG_LINE);

  const passed = hasName && hasDescription && hasBashTool && hasLogLine;
  if (passed) {
    return { passed: true, message: 'town-crier.md is structured correctly.' };
  }

  const missing = [
    !hasName && 'name: town-crier',
    !hasDescription && 'a real description',
    !hasBashTool && 'tools including Bash',
    !hasLogLine && 'the exact required log line',
  ].filter(Boolean);
  return { passed: false, message: `town-crier.md is missing: ${missing.join(', ')}.` };
}
