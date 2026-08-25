/**
 * Resolves which binary Tier 3/4 grading should spawn as "the player's own
 * claude CLI". Defaults to `claude` on PATH. CLAUDE_QUEST_CLI overrides it —
 * mainly so tests/CI can point at a stub instead of ever touching a real
 * account, without relying on PATH tricks (which behave inconsistently
 * across platforms, notably Windows' .cmd/.bat spawn restrictions).
 *
 * The override is a space-separated command, e.g.
 * CLAUDE_QUEST_CLI="node ./fake-claude.mjs" — split on whitespace, no shell
 * involved.
 */
export function resolveClaudeCommand() {
  const override = process.env.CLAUDE_QUEST_CLI;
  if (!override) return { bin: 'claude', prefixArgs: [] };
  const [bin, ...prefixArgs] = override.trim().split(/\s+/);
  return { bin, prefixArgs };
}
