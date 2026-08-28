import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { loadMissions, findMission } from '../../src/engine/missionLoader.js';

describe('missionLoader', () => {
  const missions = loadMissions();

  test('loads every mission currently in the repo', () => {
    // Pinned to the real count on purpose: a mission silently failing to
    // load (bad JSON, wrong directory shape) should fail this test, not
    // pass quietly with one fewer mission than expected.
    assert.equal(missions.length, 20);
  });

  test('campaign order matches directory order (arc dirs, then mission.json order within an arc)', () => {
    const keys = missions.map((m) => m.key);
    assert.deepEqual(keys, [
      '00-fundamentals/01-first-session',
      '00-fundamentals/your-own-name',
      '01-commands/pick-a-model',
      '01-commands/free-up-the-room',
      '01-commands/what-it-cost',
      '01-commands/where-you-left-off',
      '02-extensibility/skill-invocation',
      '02-extensibility/first-craft',
      '02-extensibility/extend-well-wisher',
      '03-subagents/summon-a-helper',
      '03-subagents/call-on-them',
      '03-subagents/their-own-judgment',
      '03-subagents/borrowed-craft',
      '04-hooks/ward-of-your-own',
      '04-hooks/iron-ward',
      '04-tooling/permissions-rack',
      '04-tooling/give-the-craft-hands',
      '04-tooling/widen-the-herald',
      '05-mcp/open-a-channel',
      '05-mcp/send-word',
    ]);
  });

  test('04-hooks sorts before 04-tooling (inserted without renumbering anything)', () => {
    const hooksIndex = missions.findIndex((m) => m.arc === 'hooks');
    const toolingIndex = missions.findIndex((m) => m.arc === 'tooling');
    assert.ok(hooksIndex < toolingIndex);
  });

  test('every mission has the required manifest fields', () => {
    for (const m of missions) {
      assert.ok(m.id, `${m.key} missing id`);
      assert.ok(m.title, `${m.key} missing title`);
      assert.ok(m.arc, `${m.key} missing arc`);
      assert.ok([1, 2, 3, 4].includes(m.tier), `${m.key} has invalid tier ${m.tier}`);
      assert.equal(typeof m.order, 'number', `${m.key} missing numeric order`);
      assert.ok(Array.isArray(m.hints), `${m.key} missing hints array`);
    }
  });

  test('every mission has non-empty goal and debrief text', () => {
    for (const m of missions) {
      assert.ok(m.goal.trim().length > 0, `${m.key} has empty goal.md`);
      assert.ok(m.debrief.trim().length > 0, `${m.key} has empty debrief.md`);
    }
  });

  test('sequence is assigned in load order, 0-indexed, no gaps', () => {
    missions.forEach((m, i) => assert.equal(m.sequence, i));
  });

  test('tier 3 missions have tests.json; tier 4 missions have rubric.json + artifact', () => {
    for (const m of missions) {
      if (m.tier === 3) {
        assert.ok(existsSync(join(m.path, 'tests.json')), `${m.key} is tier 3 but has no tests.json`);
      }
      if (m.tier === 4) {
        assert.ok(existsSync(join(m.path, 'rubric.json')), `${m.key} is tier 4 but has no rubric.json`);
        assert.ok(m.artifact, `${m.key} is tier 4 but mission.json has no artifact field`);
      }
    }
  });

  test('ungraded missions never declare tier 3/4', () => {
    for (const m of missions) {
      if (m.ungraded) assert.ok(m.tier === 1 || m.tier === 2, `${m.key} is ungraded but tier ${m.tier}`);
    }
  });

  test('findMission finds by exact key and returns null for an unknown one', () => {
    const found = findMission(missions, '00-fundamentals/01-first-session');
    assert.equal(found.title, 'First Contact');
    assert.equal(findMission(missions, 'not-a-real/mission'), null);
  });
});
