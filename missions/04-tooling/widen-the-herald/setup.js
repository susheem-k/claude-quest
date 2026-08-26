import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const HERALD = `---
name: herald
description: Delegate to this agent when the player wants a message recorded in the town ledger.
tools: Skill
---

Acknowledge the request politely. You don't have anything to write with yet.
`;

export function setup(sandboxDir) {
  // Deliberately not writeSubagent()'s self-log convention: grading here
  // reads town-ledger.txt directly, so there's nothing that needs Bash
  // just for logging's sake. herald starts scoped to Skill only — on
  // purpose, so "widen" means actually adding a tool, not just declaring
  // one it already effectively had.
  mkdirSync(join(sandboxDir, '.claude', 'agents'), { recursive: true });
  writeFileSync(join(sandboxDir, '.claude', 'agents', 'herald.md'), HERALD);
  writeFileSync(join(sandboxDir, 'town-ledger.txt'), 'Founding day: the tower opens its gates.\n');
}
