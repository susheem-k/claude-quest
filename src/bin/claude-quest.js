#!/usr/bin/env node
import { homedir } from 'node:os';
import { join } from 'node:path';
import { loadMissions, findMission } from '../engine/missionLoader.js';
import {
  listSaves,
  createSave,
  loadSave,
  writeSave,
  setCurrentSlug,
  getActiveSave,
} from '../engine/save.js';
import { gradeMission, provision } from '../engine/gradeMission.js';

// Save games and sandboxes live in the player's home directory, not wherever
// `claude` happened to be launched from — stable regardless of which project
// the player is in, and independent of whether this is running as an
// installed plugin or a manual clone. (An earlier version tried to use
// Claude Code plugin env vars for this; they turned out not to exist —
// verified against a real installed-plugin session, not assumed.)
const root = join(homedir(), '.claude-quest');
const [, , command, ...args] = process.argv;
const missions = loadMissions();

function fail(message) {
  console.error(message);
  process.exitCode = 1;
}

function requireActiveSave() {
  const save = getActiveSave(root);
  if (!save) {
    fail('No active save. Start one with: claude-quest new "<character name>"');
    return null;
  }
  return save;
}

function currentMission(save) {
  const mission = findMission(missions, save.currentMissionKey);
  if (!mission) {
    fail(`Save points at unknown mission "${save.currentMissionKey}".`);
    return null;
  }
  return mission;
}

switch (command) {
  case 'list': {
    const save = getActiveSave(root);
    for (const m of missions) {
      const done = save?.completed.includes(m.key) ? '[x]' : '[ ]';
      console.log(`${done} [tier ${m.tier}] ${m.key} — ${m.title}`);
    }
    break;
  }

  case 'new': {
    const name = args.join(' ').trim();
    if (!name) {
      fail('Usage: claude-quest new "<character name>"');
      break;
    }
    if (missions.length === 0) {
      fail('No missions exist yet.');
      break;
    }
    try {
      const save = createSave(root, name, missions[0].key);
      console.log(`Character created: ${save.name} (save slug: ${save.slug})`);
      console.log(`First mission: ${missions[0].key} — ${missions[0].title}`);
    } catch (err) {
      fail(err.message);
    }
    break;
  }

  case 'saves': {
    const saves = listSaves(root);
    if (saves.length === 0) {
      console.log('No saves yet.');
      break;
    }
    for (const s of saves) {
      console.log(`${s.slug} — ${s.name} — ${s.completed.length}/${missions.length} missions — at ${s.currentMissionKey}`);
    }
    break;
  }

  case 'load': {
    const slug = args[0];
    if (!slug) {
      fail('Usage: claude-quest load <slug>');
      break;
    }
    const save = loadSave(root, slug);
    if (!save) {
      fail(`No save named "${slug}". Run "claude-quest saves" to list them.`);
      break;
    }
    setCurrentSlug(root, slug);
    console.log(`Resumed ${save.name} — ${save.completed.length}/${missions.length} missions complete.`);
    break;
  }

  case 'status': {
    const save = requireActiveSave();
    if (!save) break;
    const mission = currentMission(save);
    if (!mission) break;
    console.log(`Character: ${save.name}`);
    console.log(`Progress: ${save.completed.length}/${missions.length} missions complete`);
    console.log(`Current mission: [tier ${mission.tier}] ${mission.key} — ${mission.title}`);
    break;
  }

  case 'goal': {
    const save = requireActiveSave();
    if (!save) break;
    const mission = currentMission(save);
    if (!mission) break;
    console.log(mission.goal);
    break;
  }

  case 'hint': {
    const save = requireActiveSave();
    if (!save) break;
    const mission = currentMission(save);
    if (!mission) break;
    const hints = mission.hints ?? [];
    const used = save.hintsUsed[mission.key] ?? 0;
    if (used >= hints.length) {
      console.log(hints.length === 0 ? 'This mission has no hints.' : "You've used every hint for this mission.");
      break;
    }
    console.log(`Hint ${used + 1}/${hints.length}: ${hints[used]}`);
    save.hintsUsed[mission.key] = used + 1;
    writeSave(root, save);
    break;
  }

  case 'sandbox-path': {
    const save = requireActiveSave();
    if (!save) break;
    const mission = currentMission(save);
    if (!mission) break;
    // Provisions (runs setup.js) if this is the first time — the whole
    // point of this command is to hand back a directory that's actually
    // ready to work in, not just a path that will exist eventually.
    console.log(await provision(root, mission));
    break;
  }

  case 'check': {
    const save = requireActiveSave();
    if (!save) break;
    const mission = currentMission(save);
    if (!mission) break;

    const result = await gradeMission(root, mission);

    if (mission.tier === 3) {
      for (const r of result.results) {
        console.log(`${r.passed ? 'PASS' : 'FAIL'}  expected fire=${r.expected} got fire=${r.actual}  — "${r.prompt}"`);
      }
    } else if (mission.tier === 4) {
      if (result.message) console.log(result.message);
      for (const c of result.criteria) {
        console.log(`${c.passed ? 'PASS' : 'FAIL'}  ${c.id} — ${c.reason}`);
      }
    } else {
      console.log(result.message);
    }
    console.log(`Sandbox: ${result.sandboxDir}`);

    if (!result.passed) {
      console.log('MISSION_STATUS: incomplete');
      break;
    }

    save.completed = Array.from(new Set([...save.completed, mission.key]));
    const next = missions[mission.sequence + 1];
    if (next) {
      save.currentMissionKey = next.key;
      writeSave(root, save);
      console.log('MISSION_STATUS: complete');
      console.log(`Next mission: [tier ${next.tier}] ${next.key} — ${next.title}`);
    } else {
      writeSave(root, save);
      console.log('MISSION_STATUS: complete');
      console.log('CAMPAIGN_STATUS: finished — no missions remain.');
    }
    break;
  }

  default: {
    console.log(`Unknown command: ${command ?? '(none)'}`);
    console.log('Usage: claude-quest <list|new|saves|load|status|goal|hint|check|sandbox-path>');
    process.exitCode = 1;
  }
}
