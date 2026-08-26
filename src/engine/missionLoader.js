import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const MISSIONS_ROOT = fileURLToPath(new URL('../../missions/', import.meta.url));

/**
 * Load every mission under missions/<arc>/<mission-id>/, in campaign order:
 * arcs sorted by directory name (hence the 00-, 02- prefixes), missions
 * within an arc sorted by mission.json's `order`. See
 * docs/DESIGN.md#mission-file-contract.
 *
 * Each mission gets a `key` (`<arc>/<id>`, unique across the whole campaign
 * and used as the identifier in save files) and a `sequence` index used to
 * find "the next mission" after one is completed.
 */
export function loadMissions(root = MISSIONS_ROOT) {
  const missions = [];
  for (const arc of listDirs(root).sort()) {
    const arcPath = join(root, arc);
    const arcMissions = [];
    for (const id of listDirs(arcPath).sort()) {
      const missionPath = join(arcPath, id);
      const manifestPath = join(missionPath, 'mission.json');
      if (!existsSync(manifestPath)) continue;
      const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
      const goalPath = join(missionPath, 'goal.md');
      const debriefPath = join(missionPath, 'debrief.md');
      arcMissions.push({
        ...manifest,
        key: `${arc}/${id}`,
        path: missionPath,
        goal: existsSync(goalPath) ? readFileSync(goalPath, 'utf8') : '',
        debrief: existsSync(debriefPath) ? readFileSync(debriefPath, 'utf8') : '',
      });
    }
    arcMissions.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    missions.push(...arcMissions);
  }
  missions.forEach((mission, sequence) => {
    mission.sequence = sequence;
  });
  return missions;
}

export function findMission(missions, key) {
  return missions.find((m) => m.key === key) ?? null;
}

function listDirs(path) {
  if (!existsSync(path)) return [];
  return readdirSync(path, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);
}
