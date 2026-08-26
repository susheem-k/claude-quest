import { writeSkill } from '../../../src/engine/sandbox.js';

export function setup(sandboxDir) {
  // Deliberately broken, continuing the well-wisher from First Craft: a real,
  // useful action behind a description too vague to reliably trigger on the
  // requests it should, or stay quiet on the ones it shouldn't.
  writeSkill(sandboxDir, {
    name: 'well-wisher',
    description: 'Says something nice.',
    action: 'Say something warm and encouraging to the player.',
  });
}
