import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const MISSIONS_ROOT = fileURLToPath(new URL('../../missions/', import.meta.url));

/**
 * Load every mission under missions/<arc>/<mission-id>/, in the order each
 * arc's mission.json declares. See docs/DESIGN.md#mission-file-contract.
 */
export function loadMissions(root = MISSIONS_ROOT) {
  const missions = [];
  for (const arc of listDirs(root)) {
    const arcPath = join(root, arc);
    for (const id of listDirs(arcPath)) {
      const missionPath = join(arcPath, id);
      const manifestPath = join(missionPath, 'mission.json');
      if (!existsSync(manifestPath)) continue;
      const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
      const goalPath = join(missionPath, 'goal.md');
      missions.push({
        ...manifest,
        path: missionPath,
        goal: existsSync(goalPath) ? readFileSync(goalPath, 'utf8') : '',
      });
    }
  }
  missions.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  return missions;
}

function listDirs(path) {
  if (!existsSync(path)) return [];
  return readdirSync(path, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);
}
