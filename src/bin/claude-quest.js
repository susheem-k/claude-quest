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
  sessionIdFor,
  deleteSave,
  resetAllSaves,
  runRootFor,
  skipMission,
  retryMission,
  completeMission,
  arcCompleted,
} from '../engine/save.js';
import { mkdirSync } from 'node:fs';
import { gradeMission, provision } from '../engine/gradeMission.js';
import { resetSandboxes } from '../engine/provision.js';
import { transcriptExists } from '../engine/claudeSessions.js';

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
      const marker = save?.completed.includes(m.key)
        ? '[x]'
        : save?.skipped?.includes(m.key)
          ? '[~]'
          : '[ ]';
      console.log(`${marker} [tier ${m.tier}] ${m.key} — ${m.title}`);
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
      const skippedNote = s.skipped?.length ? `, ${s.skipped.length} skipped` : '';
      console.log(`${s.slug} — ${s.name} — ${s.completed.length}/${missions.length} missions${skippedNote} — at ${s.currentMissionKey}`);
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
    console.log(`Progress: ${save.completed.length}/${missions.length} complete, ${save.skipped?.length ?? 0} skipped`);
    console.log(`Current mission: [tier ${mission.tier}] ${mission.key} — ${mission.title}`);
    console.log(`Arc: ${mission.arc}`);
    break;
  }

  case 'goal': {
    const save = requireActiveSave();
    if (!save) break;
    const mission = currentMission(save);
    if (!mission) break;
    console.log(`Arc: ${mission.arc}`);
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

  case 'run-root': {
    const save = requireActiveSave();
    if (!save) break;
    // Ensures the directory exists — older saves created before this
    // command existed won't have one yet.
    const dir = runRootFor(root, save.slug);
    mkdirSync(dir, { recursive: true });
    console.log(dir);
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

  case 'session': {
    const save = requireActiveSave();
    if (!save) break;
    const mission = currentMission(save);
    if (!mission) break;
    // Provisions for the same reason sandbox-path does — the command this
    // prints is meant to be pasted into a shell that has already cd'd there.
    const dir = await provision(root, mission);
    const id = sessionIdFor(root, save, mission.key);
    // --session-id mints the id; --resume attaches to it. They're contradictory
    // as a pair, so this is a choice, not a merge — and the transcript existing
    // is the only honest way to tell which one applies. Getting it backwards is
    // a loud failure either way ("session id already in use" / "no conversation
    // found"), never a silent attach to the wrong conversation.
    console.log(transcriptExists(dir, id) ? `claude --resume ${id}` : `claude --session-id ${id}`);
    break;
  }

  case 'check': {
    const save = requireActiveSave();
    if (!save) break;
    const mission = currentMission(save);
    if (!mission) break;

    const result = await gradeMission(root, mission, { runRoot: runRootFor(root, save.slug) });

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

    const wasArcComplete = arcCompleted(save, missions, mission.arc);
    const next = completeMission(root, save, mission, missions);
    console.log('MISSION_STATUS: complete');
    if (mission.debrief) console.log(`DEBRIEF:\n${mission.debrief.trim()}`);
    // Printed only on the exact check that finishes the last outstanding
    // mission of this arc — never inferred from the next mission's arc
    // differing, which a retry can trigger without the arc actually being
    // done (see arcCompleted's doc comment).
    if (!wasArcComplete && arcCompleted(save, missions, mission.arc)) {
      console.log(`ARC_COMPLETE: ${mission.arc}`);
    }
    if (next) {
      console.log(`Next mission: [tier ${next.tier}] ${next.key} — ${next.title}`);
      console.log(`Next arc: ${next.arc}`);
    } else {
      console.log('CAMPAIGN_STATUS: finished — no missions remain.');
      const stillSkipped = save.skipped?.length ?? 0;
      if (stillSkipped > 0) {
        console.log(`NOTE: ${stillSkipped} mission(s) still only skipped, not completed — "retry <mission-key>" any time.`);
      }
    }
    break;
  }

  case 'skip': {
    const save = requireActiveSave();
    if (!save) break;
    const mission = currentMission(save);
    if (!mission) break;

    // Rank/arc progression (narrated by SKILL.md off `MISSION_STATUS:
    // complete`) only ever looks at `completed`, so skipping the last
    // mission of an arc never grants that arc's rank — see skipMission.
    const next = skipMission(root, save, mission, missions);
    console.log('MISSION_STATUS: skipped');
    if (mission.debrief) console.log(`SKIPPED_DEBRIEF (what this mission would have taught you):\n${mission.debrief.trim()}`);
    if (next) {
      console.log(`Next mission: [tier ${next.tier}] ${next.key} — ${next.title}`);
      console.log(`Next arc: ${next.arc}`);
    } else {
      console.log('CAMPAIGN_STATUS: finished — no missions remain.');
    }
    console.log(`Use "retry ${mission.key}" any time to come back and earn it properly.`);
    break;
  }

  case 'retry': {
    const save = requireActiveSave();
    if (!save) break;
    const key = args[0];
    if (!key) {
      fail('Usage: claude-quest retry <mission-key>');
      break;
    }
    const mission = findMission(missions, key);
    if (!mission) {
      fail(`No such mission "${key}". Run "claude-quest list" to see valid keys.`);
      break;
    }
    if (!retryMission(root, save, key)) {
      fail(`"${key}" wasn't skipped, so there's nothing to retry.`);
      break;
    }
    console.log(`Back to [tier ${mission.tier}] ${mission.key} — ${mission.title}`);
    break;
  }

  case 'reset': {
    const target = args[0];
    if (!target) {
      fail('Usage: claude-quest reset <slug>   (or: claude-quest reset --all)');
      break;
    }
    if (target === '--all') {
      resetAllSaves(root);
      resetSandboxes(root);
      console.log('Reset complete: all saves and mission sandboxes deleted.');
      break;
    }
    const deleted = deleteSave(root, target);
    if (!deleted) {
      fail(`No save named "${target}". Run "claude-quest saves" to list them.`);
      break;
    }
    console.log(`Deleted save "${target}". Mission sandboxes are shared across characters and were left as-is — use "reset --all" to also clear those.`);
    break;
  }

  default: {
    console.log(`Unknown command: ${command ?? '(none)'}`);
    console.log('Usage: claude-quest <list|new|saves|load|status|goal|hint|check|skip|retry|sandbox-path|session|run-root|reset>');
    process.exitCode = 1;
  }
}
