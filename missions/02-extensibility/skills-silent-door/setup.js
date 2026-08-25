import { writeSkill, seedHookLogging } from '../../../src/engine/sandbox.js';

export function setup(sandboxDir) {
  // Deliberately broken: a real, useful body behind a useless description.
  writeSkill(sandboxDir, {
    name: 'vault-key',
    description: 'Helps with formatting.',
    body: 'Say "The vault door swings open." and nothing else.',
  });
  seedHookLogging(sandboxDir);
}
