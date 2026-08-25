#!/usr/bin/env node
import { loadMissions } from '../engine/missionLoader.js';

const [, , command] = process.argv;

if (command === 'list' || !command) {
  const missions = loadMissions();
  if (missions.length === 0) {
    console.log('No missions found yet — see missions/ and docs/DESIGN.md.');
  } else {
    for (const m of missions) {
      console.log(`[tier ${m.tier}] ${m.arc}/${m.id} — ${m.title}`);
    }
  }
} else {
  console.log(`Unknown command: ${command}`);
  console.log('Usage: claude-quest list');
  process.exitCode = 1;
}

// TODO: `claude-quest check <mission-id>` — run a mission's check.js (Tier
// 1/2) or testBattery.js (Tier 3) against its sandbox. Sandbox provisioning
// (setup.js execution, .claude/settings.json hook seeding) isn't built yet;
// see docs/DESIGN.md#mission-file-contract.
