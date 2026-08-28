import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { withTempDir } from '../helpers/sandbox.js';
import { readHookLog, wasInvoked } from '../../src/engine/hookLog.js';

describe('hookLog.js', () => {
  test('readHookLog returns [] for a missing file', () => {
    withTempDir((dir) => {
      assert.deepEqual(readHookLog(join(dir, 'hook.log')), []);
    });
  });

  test('readHookLog parses one JSON object per line, skipping blank lines', () => {
    withTempDir((dir) => {
      const path = join(dir, 'hook.log');
      writeFileSync(
        path,
        '{"tool":"Skill","name":"a"}\n\n{"tool":"Agent","name":"b"}\n'
      );
      assert.deepEqual(readHookLog(path), [
        { tool: 'Skill', name: 'a' },
        { tool: 'Agent', name: 'b' },
      ]);
    });
  });

  test('wasInvoked matches on tool + name, and on tool alone when name is omitted', () => {
    withTempDir((dir) => {
      const path = join(dir, 'hook.log');
      writeFileSync(path, '{"tool":"Skill","name":"vault-key"}\n');
      assert.equal(wasInvoked(path, { tool: 'Skill', name: 'vault-key' }), true);
      assert.equal(wasInvoked(path, { tool: 'Skill', name: 'well-wisher' }), false);
      assert.equal(wasInvoked(path, { tool: 'Agent', name: 'vault-key' }), false);
      assert.equal(wasInvoked(path, { tool: 'Skill' }), true);
    });
  });

  test('wasInvoked is false against a missing log', () => {
    withTempDir((dir) => {
      assert.equal(wasInvoked(join(dir, 'hook.log'), { tool: 'Skill', name: 'x' }), false);
    });
  });
});
