import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { withTempDir } from '../../helpers/sandbox.js';
import { check as wardOfYourOwnCheck } from '../../../missions/04-hooks/ward-of-your-own/check.js';

describe('Ward of Your Own (04-hooks/ward-of-your-own)', () => {
  test('fails with no hook log', () => {
    withTempDir((dir) => assert.equal(wardOfYourOwnCheck(dir).passed, false));
  });

  test('fails when a different hook fired', () => {
    withTempDir((dir) => {
      const logDir = join(dir, '.claude-quest');
      mkdirSync(logDir, { recursive: true });
      writeFileSync(join(logDir, 'hook.log'), JSON.stringify({ tool: 'Hook', name: 'iron-ward-block' }) + '\n');
      assert.equal(wardOfYourOwnCheck(dir).passed, false);
    });
  });

  test('passes once the ward fires', () => {
    withTempDir((dir) => {
      const logDir = join(dir, '.claude-quest');
      mkdirSync(logDir, { recursive: true });
      writeFileSync(join(logDir, 'hook.log'), JSON.stringify({ tool: 'Hook', name: 'ward-of-your-own' }) + '\n');
      assert.equal(wardOfYourOwnCheck(dir).passed, true);
    });
  });
});
