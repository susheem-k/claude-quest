import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Tier 2 check: reads sandbox state a live session should have produced —
 * both the incremented counter (proof the skill actually ran the read/write
 * step) and the frontmatter scoping (proof it was declared, not just left
 * on the default of "every tool this session has").
 */
export function check(sandboxDir) {
  const countPath = join(sandboxDir, 'blessing-count.txt');
  const skillPath = join(sandboxDir, '.claude', 'skills', 'well-wisher', 'SKILL.md');

  if (!existsSync(countPath)) {
    return { passed: false, message: 'blessing-count.txt is missing.' };
  }
  if (!existsSync(skillPath)) {
    return { passed: false, message: 'No .claude/skills/well-wisher/SKILL.md in this sandbox.' };
  }

  const count = readFileSync(countPath, 'utf8').trim();
  const skill = readFileSync(skillPath, 'utf8');
  const frontmatter = skill.match(/^---\n([\s\S]*?)\n---/);
  const hasBashScope = Boolean(frontmatter && /allowed-tools:\s*.*\bBash\b/im.test(frontmatter[1]));
  const incremented = count === '1';

  const passed = incremented && hasBashScope;
  if (passed) {
    return { passed: true, message: 'blessing-count.txt is now 1, and well-wisher declares allowed-tools: Bash.' };
  }
  const missing = [
    !incremented && `blessing-count.txt should read 1, currently reads "${count}"`,
    !hasBashScope && 'SKILL.md is missing allowed-tools: Bash in its frontmatter',
  ].filter(Boolean);
  return { passed: false, message: missing.join('; ') };
}
