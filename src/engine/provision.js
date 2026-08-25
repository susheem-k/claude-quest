import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

// `root` is already the dedicated state directory (~/.claude-quest) — see
// src/bin/claude-quest.js — so this is relative to it directly.
const RUNS_DIR = 'runs';

export function sandboxDirFor(root, mission) {
  return join(root, RUNS_DIR, mission.key);
}

/**
 * Ensures a mission's sandbox exists, running its setup.js exactly once.
 * "Already provisioned" is tracked with a marker file written *after*
 * setup.js succeeds, not by the directory merely existing — mkdirSync
 * creates the directory before setup.js runs, so if setup.js throws
 * partway through, a bare "does the directory exist" check would wrongly
 * treat that broken, half-populated sandbox as done and never retry it.
 * Safe to call on every `check` — a mission with no setup.js just gets an
 * empty directory, marked provisioned immediately.
 */
export async function provision(root, mission) {
  const dir = sandboxDirFor(root, mission);
  const marker = join(dir, '.provisioned');
  mkdirSync(dir, { recursive: true });

  if (!existsSync(marker)) {
    const setupPath = join(mission.path, 'setup.js');
    if (existsSync(setupPath)) {
      const mod = await import(pathToFileURL(setupPath).href);
      await mod.setup(dir);
    }
    writeFileSync(marker, '');
  }

  return dir;
}
