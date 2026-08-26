import { writeSubagent } from '../../../src/engine/sandbox.js';

export function setup(sandboxDir) {
  writeSubagent(sandboxDir, {
    name: 'town-crier',
    description:
      'Delegate to this agent when the player explicitly asks for the town-crier to make an announcement.',
    action: 'Announce something cheerful.',
  });
}
