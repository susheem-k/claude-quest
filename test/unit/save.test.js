import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { withTempDir } from '../helpers/sandbox.js';
import {
  createSave,
  loadSave,
  writeSave,
  listSaves,
  setCurrentSlug,
  getCurrentSlug,
  getActiveSave,
  deleteSave,
  resetAllSaves,
  runRootFor,
  sessionIdFor,
  skipMission,
  retryMission,
  completeMission,
  arcCompleted,
} from '../../src/engine/save.js';

// Small synthetic campaign — skipMission/retryMission only need `key` and
// `sequence`, the same shape loadMissions() produces for real missions.
const missions = [
  { key: 'a/m1', sequence: 0, arc: 'a', tier: 1, title: 'One' },
  { key: 'a/m2', sequence: 1, arc: 'a', tier: 1, title: 'Two' },
  { key: 'b/m3', sequence: 2, arc: 'b', tier: 1, title: 'Three' },
];

// A longer campaign for the retry/frontier tests below: two missions in
// arc a, three in arc b, one in arc c.
const bigMissions = [
  { key: 'a/m1', sequence: 0, arc: 'a', tier: 1, title: 'A1' },
  { key: 'a/m2', sequence: 1, arc: 'a', tier: 1, title: 'A2' },
  { key: 'b/m1', sequence: 2, arc: 'b', tier: 1, title: 'B1' },
  { key: 'b/m2', sequence: 3, arc: 'b', tier: 1, title: 'B2' },
  { key: 'b/m3', sequence: 4, arc: 'b', tier: 1, title: 'B3' },
  { key: 'c/m1', sequence: 5, arc: 'c', tier: 1, title: 'C1' },
];

describe('save.js', () => {
  test('createSave creates the save file, sets it current, and creates its run root', () => {
    withTempDir((root) => {
      const save = createSave(root, 'Test Hero', '00-fundamentals/01-first-session');
      assert.equal(save.slug, 'test-hero');
      assert.equal(save.currentMissionKey, '00-fundamentals/01-first-session');
      assert.deepEqual(save.completed, []);
      assert.equal(getCurrentSlug(root), 'test-hero');
      assert.ok(existsSync(runRootFor(root, 'test-hero')));
    });
  });

  test('createSave slugifies the name and rejects a duplicate slug', () => {
    withTempDir((root) => {
      createSave(root, 'Weird!! Name??', 'm1');
      const save = loadSave(root, 'weird-name');
      assert.ok(save);
      assert.throws(() => createSave(root, 'Weird!! Name??', 'm1'), /already exists/);
    });
  });

  test('loadSave returns null for a slug that does not exist', () => {
    withTempDir((root) => {
      assert.equal(loadSave(root, 'nobody'), null);
    });
  });

  test('writeSave persists changes back to disk', () => {
    withTempDir((root) => {
      const save = createSave(root, 'Hero', 'm1');
      save.completed.push('m1');
      writeSave(root, save);
      const reloaded = loadSave(root, 'hero');
      assert.deepEqual(reloaded.completed, ['m1']);
    });
  });

  test('listSaves returns [] for a fresh root, and every save once created', () => {
    withTempDir((root) => {
      assert.deepEqual(listSaves(root), []);
      createSave(root, 'Alice', 'm1');
      createSave(root, 'Bob', 'm1');
      const slugs = listSaves(root).map((s) => s.slug).sort();
      assert.deepEqual(slugs, ['alice', 'bob']);
    });
  });

  test('getActiveSave is null until a save exists, then follows current.json', () => {
    withTempDir((root) => {
      assert.equal(getActiveSave(root), null);
      createSave(root, 'Alice', 'm1');
      assert.equal(getActiveSave(root).slug, 'alice');
      createSave(root, 'Bob', 'm1');
      // createSave sets the new character current
      assert.equal(getActiveSave(root).slug, 'bob');
      setCurrentSlug(root, 'alice');
      assert.equal(getActiveSave(root).slug, 'alice');
    });
  });

  test('deleteSave removes the save and its run root, and clears current.json only if it was active', () => {
    withTempDir((root) => {
      createSave(root, 'Alice', 'm1');
      createSave(root, 'Bob', 'm1'); // bob is now current
      const aliceRunRoot = runRootFor(root, 'alice');

      const deletedBob = deleteSave(root, 'bob');
      assert.equal(deletedBob, true);
      assert.equal(getCurrentSlug(root), null); // bob was current, now cleared
      assert.ok(existsSync(aliceRunRoot)); // alice untouched

      assert.equal(deleteSave(root, 'nobody'), false);

      deleteSave(root, 'alice');
      assert.equal(existsSync(aliceRunRoot), false);
    });
  });

  test('resetAllSaves wipes every save and current.json, leaves the root itself usable', () => {
    withTempDir((root) => {
      createSave(root, 'Alice', 'm1');
      createSave(root, 'Bob', 'm1');
      resetAllSaves(root);
      assert.deepEqual(listSaves(root), []);
      assert.equal(getCurrentSlug(root), null);
    });
  });

  test('runRootFor is a sibling of the save file, under the same saves/ tree', () => {
    withTempDir((root) => {
      const save = createSave(root, 'Alice', 'm1');
      const runRoot = runRootFor(root, save.slug);
      assert.equal(join(runRoot, '..'), join(root, 'saves'));
    });
  });

  test('sessionIdFor mints a stable id per (character, mission), persisted across reloads', () => {
    withTempDir((root) => {
      const save = createSave(root, 'Alice', 'm1');
      const id1 = sessionIdFor(root, save, 'arc/mission-a');
      const id2 = sessionIdFor(root, save, 'arc/mission-a');
      assert.equal(id1, id2, 'same mission should return the same id on a second call');

      const idOther = sessionIdFor(root, save, 'arc/mission-b');
      assert.notEqual(idOther, id1, 'different missions get different ids');

      const reloaded = loadSave(root, 'alice');
      assert.equal(reloaded.sessions['arc/mission-a'], id1, 'id was actually persisted to disk');
    });
  });

  test('sessionIdFor works on a legacy save object with no sessions field', () => {
    withTempDir((root) => {
      const save = createSave(root, 'Alice', 'm1');
      delete save.sessions; // simulate a save written before this field existed
      writeSave(root, save);

      const id = sessionIdFor(root, save, 'arc/mission-a');
      assert.match(id, /^[0-9a-f-]{36}$/);
    });
  });

  test('skipMission records the mission in skipped, never in completed, and advances', () => {
    withTempDir((root) => {
      const save = createSave(root, 'Alice', 'a/m1');
      const next = skipMission(root, save, missions[0], missions);

      assert.deepEqual(next, missions[1]);
      assert.deepEqual(save.skipped, ['a/m1']);
      assert.deepEqual(save.completed, []); // a skip is never a pass
      assert.equal(save.currentMissionKey, 'a/m2');

      const reloaded = loadSave(root, 'alice');
      assert.deepEqual(reloaded.skipped, ['a/m1']); // persisted, not just in-memory
    });
  });

  test('skipMission on the last mission returns null and leaves currentMissionKey alone', () => {
    withTempDir((root) => {
      const save = createSave(root, 'Alice', 'b/m3');
      const next = skipMission(root, save, missions[2], missions);

      assert.equal(next, null);
      assert.deepEqual(save.skipped, ['b/m3']);
      assert.equal(save.currentMissionKey, 'b/m3'); // nothing to advance to
    });
  });

  test('skipMission never duplicates an already-skipped key', () => {
    withTempDir((root) => {
      const save = createSave(root, 'Alice', 'a/m1');
      skipMission(root, save, missions[0], missions);
      save.currentMissionKey = 'a/m1'; // simulate retrying, then skipping again
      skipMission(root, save, missions[0], missions);

      assert.deepEqual(save.skipped, ['a/m1']);
    });
  });

  test('retryMission returns false and changes nothing for a key that was never skipped', () => {
    withTempDir((root) => {
      const save = createSave(root, 'Alice', 'a/m2');
      const ok = retryMission(root, save, 'a/m1');

      assert.equal(ok, false);
      assert.equal(save.currentMissionKey, 'a/m2');
    });
  });

  test('retryMission removes the key from skipped and rewinds currentMissionKey to it', () => {
    withTempDir((root) => {
      const save = createSave(root, 'Alice', 'a/m1');
      skipMission(root, save, missions[0], missions); // now at a/m2, a/m1 skipped
      const ok = retryMission(root, save, 'a/m1');

      assert.equal(ok, true);
      assert.deepEqual(save.skipped, []);
      assert.equal(save.currentMissionKey, 'a/m1');

      const reloaded = loadSave(root, 'alice');
      assert.equal(reloaded.currentMissionKey, 'a/m1'); // persisted
    });
  });

  test('retryMission leaves completed missions untouched when rewinding past them', () => {
    withTempDir((root) => {
      const save = createSave(root, 'Alice', 'a/m1');
      skipMission(root, save, missions[0], missions); // at a/m2, a/m1 skipped
      save.completed.push('a/m2');
      save.currentMissionKey = 'b/m3'; // simulate having since completed a/m2 too

      retryMission(root, save, 'a/m1');

      assert.equal(save.currentMissionKey, 'a/m1');
      assert.deepEqual(save.completed, ['a/m2']); // untouched by the rewind
    });
  });

  test('completeMission advances to the immediately next mission when nothing is out of order', () => {
    withTempDir((root) => {
      const save = createSave(root, 'Alice', 'a/m1');
      const next = completeMission(root, save, missions[0], missions);

      assert.deepEqual(next, missions[1]);
      assert.deepEqual(save.completed, ['a/m1']);
      assert.equal(save.currentMissionKey, 'a/m2');
    });
  });

  test('completeMission on the last mission returns null and leaves currentMissionKey alone', () => {
    withTempDir((root) => {
      const save = createSave(root, 'Alice', 'b/m3');
      const next = completeMission(root, save, missions[2], missions);

      assert.equal(next, null);
      assert.equal(save.currentMissionKey, 'b/m3');
    });
  });

  test('after a retry, completeMission snaps back to the real frontier instead of the mission right after the retried one', () => {
    withTempDir((root) => {
      const save = createSave(root, 'Alice', 'a/m1');
      // a/m1 is parked, not finished — play the rest of the campaign forward.
      skipMission(root, save, bigMissions[0], bigMissions); // a/m1 skipped, at a/m2
      completeMission(root, save, bigMissions[1], bigMissions); // a/m2 done, at b/m1
      completeMission(root, save, bigMissions[2], bigMissions); // b/m1 done, at b/m2
      completeMission(root, save, bigMissions[3], bigMissions); // b/m2 done, at b/m3
      completeMission(root, save, bigMissions[4], bigMissions); // b/m3 done, at c/m1
      assert.equal(save.currentMissionKey, 'c/m1');

      // Now go back and actually earn the one that was skipped...
      retryMission(root, save, 'a/m1');
      assert.equal(save.currentMissionKey, 'a/m1');

      // ...and finishing it should NOT land on a/m2 (already completed) —
      // it should skip every already-resolved mission and snap back to c/m1.
      const next = completeMission(root, save, bigMissions[0], bigMissions);
      assert.equal(next.key, 'c/m1');
      assert.equal(save.currentMissionKey, 'c/m1');
    });
  });

  test('firstUnresolved (via completeMission) skips past skipped missions too, not just completed ones', () => {
    withTempDir((root) => {
      const save = createSave(root, 'Alice', 'a/m1');
      completeMission(root, save, bigMissions[0], bigMissions); // a/m1 done, at a/m2
      completeMission(root, save, bigMissions[1], bigMissions); // a/m2 done, at b/m1
      skipMission(root, save, bigMissions[2], bigMissions); // b/m1 skipped, at b/m2
      completeMission(root, save, bigMissions[3], bigMissions); // b/m2 done, at b/m3
      completeMission(root, save, bigMissions[4], bigMissions); // b/m3 done, at c/m1
      assert.equal(save.currentMissionKey, 'c/m1');

      retryMission(root, save, 'b/m1');
      assert.equal(save.currentMissionKey, 'b/m1');

      // b/m2 and b/m3 are already completed, and c/m1 is the true frontier.
      const next = completeMission(root, save, bigMissions[2], bigMissions);
      assert.equal(next.key, 'c/m1');
    });
  });

  test('arcCompleted is only true once every mission in the arc is in completed, never satisfied by skipped', () => {
    withTempDir((root) => {
      const save = createSave(root, 'Alice', 'b/m1');
      assert.equal(arcCompleted(save, bigMissions, 'b'), false);

      skipMission(root, save, bigMissions[2], bigMissions); // b/m1 skipped, at b/m2
      completeMission(root, save, bigMissions[3], bigMissions); // b/m2 done, at b/m3
      completeMission(root, save, bigMissions[4], bigMissions); // b/m3 done, at c/m1
      // b/m1 is still only skipped — arc b is NOT actually done yet.
      assert.equal(arcCompleted(save, bigMissions, 'b'), false);

      retryMission(root, save, 'b/m1');
      completeMission(root, save, bigMissions[2], bigMissions); // b/m1 finished for real
      assert.equal(arcCompleted(save, bigMissions, 'b'), true);
    });
  });

  test('regression: finishing a retried mission never falsely credits an arc that still has a skipped mission in it', () => {
    // This is the exact bug shape issue #16 warned about, one level removed:
    // completing b/m3 crosses into arc c (Next arc differs from arc b), but
    // b/m1 is still only skipped — an arc-changed heuristic would wrongly
    // treat arc b as just-earned here. arcCompleted is the guard against it.
    withTempDir((root) => {
      const save = createSave(root, 'Alice', 'b/m1');
      skipMission(root, save, bigMissions[2], bigMissions); // b/m1 skipped, at b/m2
      completeMission(root, save, bigMissions[3], bigMissions); // b/m2 done, at b/m3

      const wasArcComplete = arcCompleted(save, bigMissions, 'b');
      const next = completeMission(root, save, bigMissions[4], bigMissions); // finishes b/m3

      assert.equal(next.key, 'c/m1'); // crossed the arc boundary...
      assert.equal(wasArcComplete, false);
      assert.equal(arcCompleted(save, bigMissions, 'b'), false); // ...but arc b is still not done
    });
  });
});
