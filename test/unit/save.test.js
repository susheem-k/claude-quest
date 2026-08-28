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
} from '../../src/engine/save.js';

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
});
