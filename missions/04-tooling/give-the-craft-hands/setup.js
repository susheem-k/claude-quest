import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { writeSkill } from '../../../src/engine/sandbox.js';

export function setup(sandboxDir) {
  // The well-wisher from the forge, tuned description and all, but its
  // action is still just talk — it's never actually touched a file. This
  // mission is about giving it real hands, not about fixing its trigger
  // again.
  writeSkill(sandboxDir, {
    name: 'well-wisher',
    description:
      'Offers a well-wish, blessing, or good-luck send-off. Use when someone wants to be wished luck or good fortune, not for general compliments or feedback.',
    action: 'Say something warm and encouraging to the player.',
  });

  writeFileSync(join(sandboxDir, 'blessing-count.txt'), '0\n');
}
