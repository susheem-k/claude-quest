import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Tier 1 check: pure filesystem inspection. Confirms the config points at
 * the real server script (path normalized so either slash style passes),
 * not that anything has been said to it yet — that's the next mission.
 */
export function check(sandboxDir) {
  const configPath = join(sandboxDir, '.mcp.json');
  const serverPathFile = join(sandboxDir, 'mcp-server-path.txt');

  if (!existsSync(configPath)) {
    return { passed: false, message: 'No .mcp.json in this sandbox yet.' };
  }
  if (!existsSync(serverPathFile)) {
    return { passed: false, message: 'mcp-server-path.txt is missing from this sandbox — re-provision it.' };
  }

  let config;
  try {
    config = JSON.parse(readFileSync(configPath, 'utf8'));
  } catch {
    return { passed: false, message: '.mcp.json exists but isn\'t valid JSON.' };
  }

  const expectedPath = readFileSync(serverPathFile, 'utf8').trim();
  const servers = config.mcpServers ?? {};
  const matched = Object.entries(servers).find(([, def]) => {
    const combined = [def.command, ...(def.args ?? [])].join(' ').replace(/\\/g, '/');
    return combined.includes(expectedPath);
  });

  if (!matched) {
    return {
      passed: false,
      message: 'mcpServers doesn\'t have an entry pointing at the beacon server yet.',
    };
  }

  return { passed: true, message: `"${matched[0]}" is wired to the beacon server.` };
}
