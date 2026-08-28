import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync, appendFileSync } from 'node:fs';
import { join } from 'node:path';
import { withTempDir } from '../../helpers/sandbox.js';
import { check as pickAModelCheck } from '../../../missions/01-commands/pick-a-model/check.js';
import { check as whereYouLeftOffCheck } from '../../../missions/01-commands/where-you-left-off/check.js';

describe('The Model You Reach For (01-commands/pick-a-model)', () => {
  test('fails when settings.json is missing', () => {
    withTempDir((dir) => assert.equal(pickAModelCheck(dir).passed, false));
  });

  test('fails when settings.json is invalid JSON', () => {
    withTempDir((dir) => {
      mkdirSync(join(dir, '.claude'), { recursive: true });
      writeFileSync(join(dir, '.claude', 'settings.json'), 'not json');
      assert.equal(pickAModelCheck(dir).passed, false);
    });
  });

  test('fails when model is set to something other than opus', () => {
    withTempDir((dir) => {
      mkdirSync(join(dir, '.claude'), { recursive: true });
      writeFileSync(join(dir, '.claude', 'settings.json'), JSON.stringify({ model: 'haiku' }));
      assert.equal(pickAModelCheck(dir).passed, false);
    });
  });

  test('passes when model mentions opus, case-insensitively', () => {
    withTempDir((dir) => {
      mkdirSync(join(dir, '.claude'), { recursive: true });
      writeFileSync(join(dir, '.claude', 'settings.json'), JSON.stringify({ model: 'Opus' }));
      assert.equal(pickAModelCheck(dir).passed, true);
    });
  });
});

describe('Where You Left Off (01-commands/where-you-left-off)', () => {
  const logDir = (dir) => join(dir, '.claude-quest');
  const logPath = (dir) => join(logDir(dir), 'hook.log');
  const startup = (session) => JSON.stringify({ tool: 'SessionStart', name: 'startup', session });
  const resume = (session) => JSON.stringify({ tool: 'SessionStart', name: 'resume', session });

  test('fails with no sessions started at all', () => {
    withTempDir((dir) => assert.equal(whereYouLeftOffCheck(dir).passed, false));
  });

  test('fails with only one session started', () => {
    withTempDir((dir) => {
      mkdirSync(logDir(dir), { recursive: true });
      writeFileSync(logPath(dir), startup('a') + '\n');
      const result = whereYouLeftOffCheck(dir);
      assert.equal(result.passed, false);
      assert.match(result.message, /only one session/i);
    });
  });

  test('fails with two sessions started but neither resumed', () => {
    withTempDir((dir) => {
      mkdirSync(logDir(dir), { recursive: true });
      writeFileSync(logPath(dir), [startup('a'), startup('b')].join('\n') + '\n');
      const result = whereYouLeftOffCheck(dir);
      assert.equal(result.passed, false);
      assert.match(result.message, /none of them has been re-entered/i);
    });
  });

  test('fails when the player resumes the second (wrong) session', () => {
    withTempDir((dir) => {
      mkdirSync(logDir(dir), { recursive: true });
      writeFileSync(logPath(dir), [startup('a'), startup('b'), resume('b')].join('\n') + '\n');
      assert.equal(whereYouLeftOffCheck(dir).passed, false);
    });
  });

  test('passes when the player resumes the first session specifically', () => {
    withTempDir((dir) => {
      mkdirSync(logDir(dir), { recursive: true });
      writeFileSync(logPath(dir), [startup('a'), startup('b'), resume('a')].join('\n') + '\n');
      assert.equal(whereYouLeftOffCheck(dir).passed, true);
    });
  });

  test('grades the last resume, so getting it wrong then right still ends up passing', () => {
    withTempDir((dir) => {
      mkdirSync(logDir(dir), { recursive: true });
      writeFileSync(logPath(dir), startup('a') + '\n');
      appendFileSync(logPath(dir), startup('b') + '\n');
      appendFileSync(logPath(dir), resume('b') + '\n');
      assert.equal(whereYouLeftOffCheck(dir).passed, false, 'first attempt landed on b, should fail');
      appendFileSync(logPath(dir), resume('a') + '\n');
      assert.equal(whereYouLeftOffCheck(dir).passed, true, 'second attempt landed on a, should now pass');
    });
  });
});
