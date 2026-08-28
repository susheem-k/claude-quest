import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync, rmSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';

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

/**
 * A character's "run root" — a persistent directory (sibling to its
 * <slug>.json, under the same saves/ tree) that lasts the whole
 * playthrough, unlike a mission sandbox which is disposable and shared
 * across characters. Missions can seed a CLAUDE.md or other files here for
 * the player to build on across the whole campaign, not just one mission.
 */
export function runRootFor(root, slug) {
  return join(root, SAVES_DIR, slug);
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
  mkdirSync(runRootFor(root, slug), { recursive: true });
  const save = {
    slug,
    name: characterName,
    createdAt: Date.now(),
    currentMissionKey: firstMissionKey,
    completed: [],
    skipped: [],
    hintsUsed: {},
    sessions: {},
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

/**
 * The Claude Code session id this character uses for this mission, minted on
 * first ask and persisted from then on. Handing out a stable id up front —
 * rather than trying to discover afterwards which session the player opened —
 * is what makes resuming reliable: we always know exactly which transcript to
 * look for, and a miss is a plain "not started yet" rather than a wrong guess.
 *
 * Keyed by mission as well as character because a mission sandbox is shared
 * across characters (see provision.js#sandboxDirFor), so two characters can be
 * working in the same directory. Separate ids keep their conversations
 * separate; this is also why the session command never falls back to
 * `claude --continue`, which resolves to "most recent session in this
 * directory" and would hand one character the other's conversation.
 *
 * Saves created before this existed have no `sessions` object; they get one on
 * first use rather than needing a migration.
 */
export function sessionIdFor(root, save, missionKey) {
  save.sessions ??= {};
  if (!save.sessions[missionKey]) {
    save.sessions[missionKey] = randomUUID();
    writeSave(root, save);
  }
  return save.sessions[missionKey];
}

/**
 * Marks `mission` skipped on `save` and advances `currentMissionKey` the same
 * way a passing `check` does — but into `skipped`, a sibling of `completed`,
 * never `completed` itself, so a skip can never be mistaken for an earned
 * pass (rank/arc progression, and anything else that trusts `completed`,
 * keeps meaning exactly what it always meant). Returns the next mission
 * (or null at the end of the campaign) for the caller to relay.
 */
export function skipMission(root, save, mission, missions) {
  save.skipped = Array.from(new Set([...(save.skipped ?? []), mission.key]));
  const next = missions[mission.sequence + 1] ?? null;
  if (next) save.currentMissionKey = next.key;
  writeSave(root, save);
  return next;
}

/**
 * Reverses a skip: only succeeds on a mission that's actually in `skipped`.
 * Missions completed in the meantime stay in `completed` untouched — this
 * only moves what mission the save is currently "at". Returns true on
 * success, false if `key` was never skipped.
 */
export function retryMission(root, save, key) {
  const skipped = save.skipped ?? [];
  if (!skipped.includes(key)) return false;
  save.skipped = skipped.filter((k) => k !== key);
  save.currentMissionKey = key;
  writeSave(root, save);
  return true;
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
  rmSync(runRootFor(root, slug), { recursive: true, force: true });
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
