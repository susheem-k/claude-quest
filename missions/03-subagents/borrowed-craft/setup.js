import { writeSkill, writeSubagent } from '../../../src/engine/sandbox.js';

export function setup(sandboxDir) {
  // The same well-wisher from the extensibility arc, already tuned — this
  // mission isn't about fixing a description again, it's about a subagent
  // reaching for a skill instead of doing the work itself.
  writeSkill(sandboxDir, {
    name: 'well-wisher',
    description:
      'Offers a well-wish, blessing, or good-luck send-off. Use when someone wants to be wished luck or good fortune, not for general compliments or feedback.',
    action: 'Say something warm and encouraging to the player.',
  });

  writeSubagent(sandboxDir, {
    name: 'herald',
    description: 'Delegate to this agent when the player wants a well-wish delivered through the herald.',
    tools: 'Skill, Bash',
    action: 'Use the well-wisher skill to deliver a well-wish.',
  });
}
