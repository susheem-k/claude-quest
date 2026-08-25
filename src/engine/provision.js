import { existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

// `root` is already the dedicated state directory (~/.claude-quest) — see
// src/bin/claude-quest.js — so this is relative to it directly.
const RUNS_DIR = 'runs';

export function sandboxDirFor(root, mission) {
  return join(root, RUNS_DIR, mission.key);
}

/**
 * Ensures a mission's sandbox exists, running its setup.js exactly once
 * (the first time the sandbox directory is created). Safe to call on every
 * `check` — a mission with no setup.js just gets an empty directory.
 */
export async function provision(root, mission) {
  const dir = sandboxDirFor(root, mission);
  const alreadyProvisioned = existsSync(dir);
  mkdirSync(dir, { recursive: true });

  if (!alreadyProvisioned) {
    const setupPath = join(mission.path, 'setup.js');
    if (existsSync(setupPath)) {
      const mod = await import(pathToFileURL(setupPath).href);
      await mod.setup(dir);
    }
  }

  return dir;
}
