import { writeSubagent } from '../../../src/engine/sandbox.js';

export function setup(sandboxDir) {
  // Deliberately broken: a description too vague to reliably trigger
  // auto-delegation on the requests it should, without also catching ones
  // it shouldn't.
  writeSubagent(sandboxDir, {
    name: 'town-crier',
    description: 'Handles announcements.',
    action: 'Announce something cheerful.',
  });
}
