import { writeSkill, seedHookLogging } from '../../../src/engine/sandbox.js';

export function setup(sandboxDir) {
  writeSkill(sandboxDir, {
    name: 'torch-lighter',
    description:
      'Lights the torch in this sandbox. Use when the player explicitly asks to light, ignite, or activate the torch.',
    body: 'Say "The torch is lit." and nothing else.',
  });
  seedHookLogging(sandboxDir);
}
