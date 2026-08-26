import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync, rmSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Save games. Multiple named characters can play the same campaign
 * independently; one of them is "current" at a time. `root` (passed in by
 * every function here) is already the dedicated state directory
 * (~/.claude-quest — see src/bin/claude-quest.js), so paths here are
 * relative to it directly, no extra namespacing subdirectory.
 */

const SAVES_DIR = 'saves';
const CURRENT_PATH = 'current.json';

function slugify(name) {
  const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return slug || 'hero';
}

function savePath(root, slug) {
  return join(root, SAVES_DIR, `${slug}.json`);
}

export function listSaves(root) {
  const dir = join(root, SAVES_DIR);
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => JSON.parse(readFileSync(join(dir, f), 'utf8')))
    .sort((a, b) => a.createdAt - b.createdAt);
}

export function createSave(root, characterName, firstMissionKey) {
  const slug = slugify(characterName);
  if (existsSync(savePath(root, slug))) {
    throw new Error(`A save already exists for "${characterName}". Use "load ${slug}" instead.`);
  }
  mkdirSync(join(root, SAVES_DIR), { recursive: true });
  const save = {
    slug,
    name: characterName,
    createdAt: Date.now(),
    currentMissionKey: firstMissionKey,
    completed: [],
    hintsUsed: {},
  };
  writeFileSync(savePath(root, slug), JSON.stringify(save, null, 2));
  setCurrentSlug(root, slug);
  return save;
}

export function loadSave(root, slug) {
  const path = savePath(root, slug);
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, 'utf8'));
}

export function writeSave(root, save) {
  writeFileSync(savePath(root, save.slug), JSON.stringify(save, null, 2));
}

export function setCurrentSlug(root, slug) {
  mkdirSync(root, { recursive: true });
  writeFileSync(join(root, CURRENT_PATH), JSON.stringify({ slug }, null, 2));
}

export function getCurrentSlug(root) {
  const path = join(root, CURRENT_PATH);
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, 'utf8')).slug;
}

/** The active save, or null if there's no game in progress yet. */
export function getActiveSave(root) {
  const slug = getCurrentSlug(root);
  if (!slug) return null;
  return loadSave(root, slug);
}

/**
 * Deletes one character's save. If it was the active save, also clears
 * current.json so a stale slug doesn't linger as "current" once its file
 * is gone.
 */
export function deleteSave(root, slug) {
  const path = savePath(root, slug);
  if (!existsSync(path)) return false;
  unlinkSync(path);
  if (getCurrentSlug(root) === slug) {
    const currentPath = join(root, CURRENT_PATH);
    if (existsSync(currentPath)) unlinkSync(currentPath);
  }
  return true;
}

/** Deletes every save and clears current.json — mission sandboxes are untouched. */
export function resetAllSaves(root) {
  rmSync(join(root, SAVES_DIR), { recursive: true, force: true });
  rmSync(join(root, CURRENT_PATH), { force: true });
}
