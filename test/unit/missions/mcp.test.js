import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { withTempDir } from '../../helpers/sandbox.js';
import { check as openAChannelCheck } from '../../../missions/05-mcp/open-a-channel/check.js';
import { check as sendWordCheck } from '../../../missions/05-mcp/send-word/check.js';

describe('Open a Channel (05-mcp/open-a-channel)', () => {
  test('fails when .mcp.json is missing', () => {
    withTempDir((dir) => {
      writeFileSync(join(dir, 'mcp-server-path.txt'), '/repo/missions/05-mcp/open-a-channel/mcp-server.mjs\n');
      assert.equal(openAChannelCheck(dir).passed, false);
    });
  });

  test('fails when mcp-server-path.txt is missing (a broken/old sandbox)', () => {
    withTempDir((dir) => {
      writeFileSync(
        join(dir, '.mcp.json'),
        JSON.stringify({ mcpServers: { beacon: { command: 'node', args: ['/anything'] } } })
      );
      assert.equal(openAChannelCheck(dir).passed, false);
    });
  });

  test('fails when .mcp.json points at a different server', () => {
    withTempDir((dir) => {
      writeFileSync(join(dir, 'mcp-server-path.txt'), '/repo/missions/05-mcp/open-a-channel/mcp-server.mjs\n');
      writeFileSync(
        join(dir, '.mcp.json'),
        JSON.stringify({
          mcpServers: { beacon: { type: 'stdio', command: 'node', args: ['/somewhere/else/server.mjs'] } },
        })
      );
      assert.equal(openAChannelCheck(dir).passed, false);
    });
  });

  test('passes when .mcp.json points at the real server, regardless of slash style', () => {
    withTempDir((dir) => {
      const serverPath = '/repo/missions/05-mcp/open-a-channel/mcp-server.mjs';
      writeFileSync(join(dir, 'mcp-server-path.txt'), serverPath + '\n');
      writeFileSync(
        join(dir, '.mcp.json'),
        JSON.stringify({
          mcpServers: { beacon: { type: 'stdio', command: 'node', args: [serverPath.replace(/\//g, '\\')] } },
        })
      );
      const result = openAChannelCheck(dir);
      assert.equal(result.passed, true);
      assert.match(result.message, /beacon/);
    });
  });
});

describe('Send Word (05-mcp/send-word)', () => {
  test('fails with no hook log', () => {
    withTempDir((dir) => assert.equal(sendWordCheck(dir).passed, false));
  });

  test('fails when a different tool fired', () => {
    withTempDir((dir) => {
      const logDir = join(dir, '.claude-quest');
      mkdirSync(logDir, { recursive: true });
      writeFileSync(join(logDir, 'hook.log'), JSON.stringify({ tool: 'Skill', name: 'send_word' }) + '\n');
      assert.equal(sendWordCheck(dir).passed, false);
    });
  });

  test('passes once send_word fires', () => {
    withTempDir((dir) => {
      const logDir = join(dir, '.claude-quest');
      mkdirSync(logDir, { recursive: true });
      writeFileSync(join(logDir, 'hook.log'), JSON.stringify({ tool: 'MCP', name: 'send_word' }) + '\n');
      assert.equal(sendWordCheck(dir).passed, true);
    });
  });
});
