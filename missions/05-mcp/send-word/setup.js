import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

/**
 * Unlike Open a Channel, this mission pre-wires .mcp.json correctly — the
 * point here is invoking the tool, not writing the config again. The log
 * directory is passed as an explicit second argument (not assumed from the
 * server's own cwd, which isn't documented behavior to depend on) so the
 * tool handler knows exactly where to record that it fired.
 */
export function setup(sandboxDir) {
  const serverPath = fileURLToPath(new URL('./mcp-server.mjs', import.meta.url)).replace(/\\/g, '/');
  const logDir = join(sandboxDir, '.claude-quest').replace(/\\/g, '/');
  mkdirSync(join(sandboxDir, '.claude-quest'), { recursive: true });

  const config = {
    mcpServers: {
      beacon: {
        type: 'stdio',
        command: 'node',
        args: [serverPath, logDir],
      },
    },
  };
  writeFileSync(join(sandboxDir, '.mcp.json'), JSON.stringify(config, null, 2));
}
