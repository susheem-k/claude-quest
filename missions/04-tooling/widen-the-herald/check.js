import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ORIGINAL_LINE = 'Founding day: the tower opens its gates.';

/**
 * Tier 2 check: reads sandbox state a live session should have produced —
 * both a real new ledger line (proof the widened herald actually wrote
 * something) and the frontmatter change itself (proof Bash was added on
 * purpose, not just used without being declared).
 */
export function check(sandboxDir) {
  const ledgerPath = join(sandboxDir, 'town-ledger.txt');
  const heraldPath = join(sandboxDir, '.claude', 'agents', 'herald.md');

  if (!existsSync(ledgerPath) || !existsSync(heraldPath)) {
    return { passed: false, message: 'town-ledger.txt or herald.md is missing from this sandbox.' };
  }

  const ledgerLines = readFileSync(ledgerPath, 'utf8').split('\n').filter(Boolean);
  const grew = ledgerLines.length > 1 && ledgerLines[0].trim() === ORIGINAL_LINE;

  const herald = readFileSync(heraldPath, 'utf8');
  const frontmatter = herald.match(/^---\n([\s\S]*?)\n---/);
  const tools = frontmatter ? frontmatter[1].match(/tools:\s*(.+)$/im) : null;
  const toolsLine = tools ? tools[1] : '';
  const hasBothTools = /\bSkill\b/i.test(toolsLine) && /\bBash\b/i.test(toolsLine);

  const passed = grew && hasBothTools;
  if (passed) {
    return { passed: true, message: 'town-ledger.txt grew, and herald.md now lists both Skill and Bash.' };
  }
  const missing = [
    !grew && 'town-ledger.txt hasn\'t grown past its original line yet',
    !hasBothTools && 'herald.md\'s tools field should list both Skill and Bash',
  ].filter(Boolean);
  return { passed: false, message: missing.join('; ') };
}
