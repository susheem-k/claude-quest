import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { withTempDir } from '../../helpers/sandbox.js';
import { check as sayTheWordCheck } from '../../../missions/02-extensibility/skill-invocation/check.js';
import { check as firstCraftCheck } from '../../../missions/02-extensibility/first-craft/check.js';

function logLine(dir, tool, name) {
  const logDir = join(dir, '.claude-quest');
  mkdirSync(logDir, { recursive: true });
  writeFileSync(join(logDir, 'hook.log'), JSON.stringify({ tool, name }) + '\n');
}

describe('Say the Word (02-extensibility/skill-invocation)', () => {
  test('fails with no hook log', () => {
    withTempDir((dir) => assert.equal(sayTheWordCheck(dir).passed, false));
  });

  test('fails when a different skill fired', () => {
    withTempDir((dir) => {
      logLine(dir, 'Skill', 'well-wisher');
      assert.equal(sayTheWordCheck(dir).passed, false);
    });
  });

  test('passes when torch-lighter fired', () => {
    withTempDir((dir) => {
      logLine(dir, 'Skill', 'torch-lighter');
      assert.equal(sayTheWordCheck(dir).passed, true);
    });
  });
});

describe('First Craft (02-extensibility/first-craft)', () => {
  test('fails with no hook log', () => {
    withTempDir((dir) => assert.equal(firstCraftCheck(dir).passed, false));
  });

  test('fails when the tool matches but not the name', () => {
    withTempDir((dir) => {
      logLine(dir, 'Skill', 'torch-lighter');
      assert.equal(firstCraftCheck(dir).passed, false);
    });
  });

  test('passes when well-wisher fired', () => {
    withTempDir((dir) => {
      logLine(dir, 'Skill', 'well-wisher');
      assert.equal(firstCraftCheck(dir).passed, true);
    });
  });
});
