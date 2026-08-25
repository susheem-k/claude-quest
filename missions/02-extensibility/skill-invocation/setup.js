import { writeSkill } from '../../../src/engine/sandbox.js';

export function setup(sandboxDir) {
  writeSkill(sandboxDir, {
    name: 'torch-lighter',
    description:
      'Lights the torch in this sandbox. Use when the player explicitly asks to light, ignite, or activate the torch.',
    action: 'Say "The torch is lit."',
  });
}
