import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { withTempDir } from '../../helpers/sandbox.js';
import { check as firstContactCheck } from '../../../missions/00-fundamentals/01-first-session/check.js';
import { check as yourOwnNameCheck } from '../../../missions/00-fundamentals/your-own-name/check.js';

describe('First Contact (00-fundamentals/01-first-session)', () => {
  test('fails when CLAUDE.md is missing', () => {
    withTempDir((dir) => {
      const result = firstContactCheck(dir);
      assert.equal(result.passed, false);
    });
  });

  test('fails when CLAUDE.md exists but never mentions npm test', () => {
    withTempDir((dir) => {
      writeFileSync(join(dir, 'CLAUDE.md'), '# Notes\nThis project is great.');
      assert.equal(firstContactCheck(dir).passed, false);
    });
  });

  test('passes once CLAUDE.md mentions npm test, case-insensitively', () => {
    withTempDir((dir) => {
      writeFileSync(join(dir, 'CLAUDE.md'), 'Run tests with NPM TEST.');
      assert.equal(firstContactCheck(dir).passed, true);
    });
  });
});

describe('Your Own Name (00-fundamentals/your-own-name)', () => {
  test('fails when there is no run root at all', () => {
    const result = yourOwnNameCheck('/unused-sandbox', {});
    assert.equal(result.passed, false);
  });

  test('fails when the run root has no CLAUDE.md', () => {
    withTempDir((runRoot) => {
      assert.equal(yourOwnNameCheck('/unused', { runRoot }).passed, false);
    });
  });

  test('fails on the unedited template line', () => {
    withTempDir((runRoot) => {
      writeFileSync(join(runRoot, 'CLAUDE.md'), 'Call me <your nickname>.');
      assert.equal(yourOwnNameCheck('/unused', { runRoot }).passed, false);
    });
  });

  test('passes with a real nickname, and echoes it back in the message', () => {
    withTempDir((runRoot) => {
      writeFileSync(join(runRoot, 'CLAUDE.md'), 'Call me Ash.');
      const result = yourOwnNameCheck('/unused', { runRoot });
      assert.equal(result.passed, true);
      assert.match(result.message, /Ash/);
    });
  });

  test('is graded against runRoot, not sandboxDir — a CLAUDE.md only in sandboxDir does not pass', () => {
    withTempDir((sandboxDir) => {
      withTempDir((runRoot) => {
        writeFileSync(join(sandboxDir, 'CLAUDE.md'), 'Call me Ash.');
        assert.equal(yourOwnNameCheck(sandboxDir, { runRoot }).passed, false);
      });
    });
  });
});
