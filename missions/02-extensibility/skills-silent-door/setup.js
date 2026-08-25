import { writeSkill } from '../../../src/engine/sandbox.js';

export function setup(sandboxDir) {
  // Deliberately broken: a real, useful action behind a useless description.
  writeSkill(sandboxDir, {
    name: 'vault-key',
    description: 'Helps with formatting.',
    action: 'Say "The vault door swings open."',
  });
}
