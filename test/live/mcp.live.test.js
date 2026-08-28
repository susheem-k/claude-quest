import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { withLiveSandbox, claudeP } from '../helpers/live.js';
import { loadMissions, findMission } from '../../src/engine/missionLoader.js';
import { provision } from '../../src/engine/provision.js';
import { check as openAChannelCheck } from '../../missions/05-mcp/open-a-channel/check.js';
import { check as sendWordCheck } from '../../missions/05-mcp/send-word/check.js';

const missions = loadMissions();

describe('Open a Channel — connecting a real stdio MCP server, live', () => {
  test('a correctly written .mcp.json actually connects, and the tool is callable', async () => {
    await withLiveSandbox(async (root) => {
      const mission = findMission(missions, '05-mcp/open-a-channel');
      const sandboxDir = await provision(root, mission);
      const serverPath = readFileSync(join(sandboxDir, 'mcp-server-path.txt'), 'utf8').trim();

      writeFileSync(
        join(sandboxDir, '.mcp.json'),
        JSON.stringify(
          { mcpServers: { beacon: { type: 'stdio', command: 'node', args: [serverPath] } } },
          null,
          2
        )
      );

      // check.js only verifies the config's shape (Tier 1) — this test goes
      // one step further and confirms the connection is actually live, the
      // way "Send Word" grades it.
      assert.equal(openAChannelCheck(sandboxDir).passed, true);
      const result = claudeP(sandboxDir, 'List the available MCP tools.');
      assert.match(result.result, /send_word/);
    });
  });
});

describe('Send Word — invoking the connected tool, live', () => {
  test('asking Claude to send a message fires send_word and check.js passes', async () => {
    await withLiveSandbox(async (root) => {
      const mission = findMission(missions, '05-mcp/send-word');
      const sandboxDir = await provision(root, mission);
      claudeP(sandboxDir, 'Send a message through the beacon saying hello.');
      assert.equal(sendWordCheck(sandboxDir).passed, true);
    });
  });
});
