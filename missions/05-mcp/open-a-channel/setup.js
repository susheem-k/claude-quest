import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

export function setup(sandboxDir) {
  // The server script deliberately isn't copied into the sandbox — it stays
  // in this mission's own directory in the repo, so it can resolve
  // @modelcontextprotocol/sdk from the repo's own node_modules (Node
  // resolves node_modules relative to a script's real disk location, not
  // the process cwd). The player only needs its path, which this file hands
  // them so nothing about the repo's own layout has to be guessed.
  const serverPath = fileURLToPath(new URL('./mcp-server.mjs', import.meta.url)).replace(/\\/g, '/');
  writeFileSync(join(sandboxDir, 'mcp-server-path.txt'), serverPath + '\n');
}
