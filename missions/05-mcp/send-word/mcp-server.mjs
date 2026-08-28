#!/usr/bin/env node
/**
 * A minimal, real MCP server — one tool, connected over stdio. Lives here,
 * inside the mission's own directory in the repo, not copied into the
 * sandbox: Node resolves `node_modules` relative to a script's real disk
 * location, not the process cwd, so a script that stays put here can
 * `import` @modelcontextprotocol/sdk from this repo's own node_modules
 * regardless of where the player's sandbox actually is. That's also why
 * .mcp.json references this file by absolute path instead of a copy.
 *
 * The tool's own handler appends the invocation log line directly — no
 * reliance on Claude choosing to run a Bash command the way skill/subagent
 * self-logging does. The handler *is* the log write, so it's deterministic
 * by construction. The log directory comes in as argv[2] rather than being
 * assumed from cwd, since a spawned MCP server's working directory isn't
 * documented behavior to depend on.
 */
import { appendFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

const logDir = process.argv[2];

const server = new McpServer({ name: 'beacon', version: '1.0.0' });

server.registerTool(
  'send_word',
  {
    title: 'Send Word',
    description: 'Sends a short message through the beacon.',
    inputSchema: { message: z.string().describe('The message to send') },
  },
  async ({ message }) => {
    if (logDir) {
      mkdirSync(logDir, { recursive: true });
      appendFileSync(join(logDir, 'hook.log'), JSON.stringify({ tool: 'MCP', name: 'send_word' }) + '\n');
    }
    return { content: [{ type: 'text', text: `The beacon carries it: "${message}"` }] };
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
