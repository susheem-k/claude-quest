import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { withTempDir } from '../../helpers/sandbox.js';
import { check as summonAHelperCheck } from '../../../missions/03-subagents/summon-a-helper/check.js';
import { check as callOnThemCheck } from '../../../missions/03-subagents/call-on-them/check.js';
import { check as borrowedCraftCheck } from '../../../missions/03-subagents/borrowed-craft/check.js';

const REQUIRED_LOG_LINE = 'printf \'{"tool":"Agent","name":"town-crier"}\\n\' >> .claude-quest/hook.log';

function writeAgent(dir, name, frontmatter, body) {
  const agentDir = join(dir, '.claude', 'agents');
  mkdirSync(agentDir, { recursive: true });
  writeFileSync(join(agentDir, `${name}.md`), `---\n${frontmatter}\n---\n\n${body}`);
}

function logLine(dir, tool, name) {
  const logDir = join(dir, '.claude-quest');
  mkdirSync(logDir, { recursive: true });
  writeFileSync(join(logDir, 'hook.log'), JSON.stringify({ tool, name }) + '\n');
}

describe('Summon a Helper (03-subagents/summon-a-helper)', () => {
  test('fails when town-crier.md is missing', () => {
    withTempDir((dir) => assert.equal(summonAHelperCheck(dir).passed, false));
  });

  test('fails without a frontmatter block at all', () => {
    withTempDir((dir) => {
      mkdirSync(join(dir, '.claude', 'agents'), { recursive: true });
      writeFileSync(join(dir, '.claude', 'agents', 'town-crier.md'), 'just a body, no frontmatter');
      assert.equal(summonAHelperCheck(dir).passed, false);
    });
  });

  test('fails when Bash is missing from tools', () => {
    withTempDir((dir) => {
      writeAgent(
        dir,
        'town-crier',
        'name: town-crier\ndescription: Announces things.\ntools: Read',
        `Announce something.\n\n${REQUIRED_LOG_LINE}\n`
      );
      const result = summonAHelperCheck(dir);
      assert.equal(result.passed, false);
      assert.match(result.message, /Bash/);
    });
  });

  test('fails when the exact log line is missing', () => {
    withTempDir((dir) => {
      writeAgent(
        dir,
        'town-crier',
        'name: town-crier\ndescription: Announces things.\ntools: Bash',
        'Announce something, then log it somehow.'
      );
      const result = summonAHelperCheck(dir);
      assert.equal(result.passed, false);
      assert.match(result.message, /log line/);
    });
  });

  test('passes with a correctly structured file', () => {
    withTempDir((dir) => {
      writeAgent(
        dir,
        'town-crier',
        'name: town-crier\ndescription: Announces things when called on.\ntools: Bash',
        `Announce something cheerful.\n\n${REQUIRED_LOG_LINE}\n`
      );
      assert.equal(summonAHelperCheck(dir).passed, true);
    });
  });
});

describe('Call on Them (03-subagents/call-on-them)', () => {
  test('fails with no hook log', () => {
    withTempDir((dir) => assert.equal(callOnThemCheck(dir).passed, false));
  });

  test('passes once town-crier fires', () => {
    withTempDir((dir) => {
      logLine(dir, 'Agent', 'town-crier');
      assert.equal(callOnThemCheck(dir).passed, true);
    });
  });
});

describe('Borrowed Craft (03-subagents/borrowed-craft)', () => {
  test('fails when neither herald nor well-wisher fired', () => {
    withTempDir((dir) => assert.equal(borrowedCraftCheck(dir).passed, false));
  });

  test('fails when only the herald fired, without the skill', () => {
    withTempDir((dir) => {
      const logDir = join(dir, '.claude-quest');
      mkdirSync(logDir, { recursive: true });
      writeFileSync(join(logDir, 'hook.log'), JSON.stringify({ tool: 'Agent', name: 'herald' }) + '\n');
      const result = borrowedCraftCheck(dir);
      assert.equal(result.passed, false);
      assert.match(result.message, /well-wisher/);
    });
  });

  test('fails when only the skill fired, without the herald (main thread invoked it directly)', () => {
    withTempDir((dir) => {
      const logDir = join(dir, '.claude-quest');
      mkdirSync(logDir, { recursive: true });
      writeFileSync(join(logDir, 'hook.log'), JSON.stringify({ tool: 'Skill', name: 'well-wisher' }) + '\n');
      const result = borrowedCraftCheck(dir);
      assert.equal(result.passed, false);
      assert.match(result.message, /herald/);
    });
  });

  test('passes when both herald and well-wisher fired', () => {
    withTempDir((dir) => {
      const logDir = join(dir, '.claude-quest');
      mkdirSync(logDir, { recursive: true });
      const lines = [
        JSON.stringify({ tool: 'Agent', name: 'herald' }),
        JSON.stringify({ tool: 'Skill', name: 'well-wisher' }),
      ];
      writeFileSync(join(logDir, 'hook.log'), lines.join('\n') + '\n');
      assert.equal(borrowedCraftCheck(dir).passed, true);
    });
  });
});
