import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { withTempDir } from '../../helpers/sandbox.js';
import { check as permissionsRackCheck } from '../../../missions/04-tooling/permissions-rack/check.js';
import { check as giveTheCraftHandsCheck } from '../../../missions/04-tooling/give-the-craft-hands/check.js';
import { check as widenTheHeraldCheck } from '../../../missions/04-tooling/widen-the-herald/check.js';

describe('The Ledger (04-tooling/permissions-rack)', () => {
  test('fails when settings.local.json is missing', () => {
    withTempDir((dir) => assert.equal(permissionsRackCheck(dir).passed, false));
  });

  test('fails when the allow list is missing the exact rule', () => {
    withTempDir((dir) => {
      mkdirSync(join(dir, '.claude'), { recursive: true });
      writeFileSync(
        join(dir, '.claude', 'settings.local.json'),
        JSON.stringify({ permissions: { allow: ['Bash(npm run *)'] } })
      );
      assert.equal(permissionsRackCheck(dir).passed, false);
    });
  });

  test('passes once Bash(npm test:*) is in permissions.allow', () => {
    withTempDir((dir) => {
      mkdirSync(join(dir, '.claude'), { recursive: true });
      writeFileSync(
        join(dir, '.claude', 'settings.local.json'),
        JSON.stringify({ permissions: { allow: ['Bash(npm test:*)'] } })
      );
      assert.equal(permissionsRackCheck(dir).passed, true);
    });
  });
});

function writeSkill(dir, name, frontmatterExtra, body) {
  const skillDir = join(dir, '.claude', 'skills', name);
  mkdirSync(skillDir, { recursive: true });
  writeFileSync(join(skillDir, 'SKILL.md'), `---\nname: ${name}\n${frontmatterExtra}\n---\n\n${body}`);
}

describe('Give the Craft Hands (04-tooling/give-the-craft-hands)', () => {
  test('fails when blessing-count.txt is missing', () => {
    withTempDir((dir) => assert.equal(giveTheCraftHandsCheck(dir).passed, false));
  });

  test('fails when the count has not incremented, even with allowed-tools set', () => {
    withTempDir((dir) => {
      writeFileSync(join(dir, 'blessing-count.txt'), '0\n');
      writeSkill(dir, 'well-wisher', 'description: x\nallowed-tools: Bash', 'Say something.');
      assert.equal(giveTheCraftHandsCheck(dir).passed, false);
    });
  });

  test('fails when the count incremented but allowed-tools was never declared', () => {
    withTempDir((dir) => {
      writeFileSync(join(dir, 'blessing-count.txt'), '1\n');
      writeSkill(dir, 'well-wisher', 'description: x', 'Say something.');
      const result = giveTheCraftHandsCheck(dir);
      assert.equal(result.passed, false);
      assert.match(result.message, /allowed-tools/);
    });
  });

  test('passes when the count is 1 and allowed-tools includes Bash', () => {
    withTempDir((dir) => {
      writeFileSync(join(dir, 'blessing-count.txt'), '1\n');
      writeSkill(dir, 'well-wisher', 'description: x\nallowed-tools: Bash', 'Say something.');
      assert.equal(giveTheCraftHandsCheck(dir).passed, true);
    });
  });
});

describe("Widen the Herald's Reach (04-tooling/widen-the-herald)", () => {
  const ORIGINAL = 'Founding day: the tower opens its gates.';

  function writeHerald(dir, toolsLine) {
    mkdirSync(join(dir, '.claude', 'agents'), { recursive: true });
    writeFileSync(
      join(dir, '.claude', 'agents', 'herald.md'),
      `---\nname: herald\ndescription: x\n${toolsLine}\n---\n\nDo something.`
    );
  }

  test('fails when the ledger or herald file is missing', () => {
    withTempDir((dir) => assert.equal(widenTheHeraldCheck(dir).passed, false));
  });

  test('fails when the ledger has not grown, even with both tools declared', () => {
    withTempDir((dir) => {
      writeFileSync(join(dir, 'town-ledger.txt'), ORIGINAL + '\n');
      writeHerald(dir, 'tools: Skill, Bash');
      assert.equal(widenTheHeraldCheck(dir).passed, false);
    });
  });

  test('fails when the ledger grew but Bash was never added to tools', () => {
    withTempDir((dir) => {
      writeFileSync(join(dir, 'town-ledger.txt'), ORIGINAL + '\nA new entry.\n');
      writeHerald(dir, 'tools: Skill');
      const result = widenTheHeraldCheck(dir);
      assert.equal(result.passed, false);
      assert.match(result.message, /tools/);
    });
  });

  test('passes when the ledger grew and tools lists both Skill and Bash', () => {
    withTempDir((dir) => {
      writeFileSync(join(dir, 'town-ledger.txt'), ORIGINAL + '\nA new entry.\n');
      writeHerald(dir, 'tools: Skill, Bash');
      assert.equal(widenTheHeraldCheck(dir).passed, true);
    });
  });
});
