import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { writeFileSync, mkdirSync, closeSync, openSync } from 'node:fs';
import { join } from 'node:path';
import { withTempDir } from '../helpers/sandbox.js';
import { escapeCwd, configDir, transcriptPath, transcriptExists } from '../../src/engine/claudeSessions.js';

describe('claudeSessions.js', () => {
  test('escapeCwd matches the real Claude Code directory name for a path containing dots', () => {
    // Pinned to a live-verified case (see docs/DESIGN.md / PR #15): running a
    // real claude -p session in a directory whose name contained dots
    // produced this exact directory under ~/.claude/projects/. This is the
    // specific edge case an earlier, wrong implementation missed.
    const cwd =
      String.raw`C:\Users\sushe\AppData\Local\Temp\claude\C--Users-sushe-OneDrive-Desktop-projects-claude-quest` +
      String.raw`\0d308ed0-f0bb-4d3b-9316-0364b4f443c4\scratchpad\dot.test.dir`;
    const expected =
      'C--Users-sushe-AppData-Local-Temp-claude-C--Users-sushe-OneDrive-Desktop-projects-claude-quest' +
      '-0d308ed0-f0bb-4d3b-9316-0364b4f443c4-scratchpad-dot-test-dir';
    assert.equal(escapeCwd(cwd), expected);
  });

  test('escapeCwd replaces every non-alphanumeric character, not just path separators', () => {
    assert.equal(escapeCwd('/a/b_c d.e~f'), '-a-b-c-d-e-f');
  });

  test('escapeCwd is deterministic and stable across repeated calls', () => {
    const cwd = '/some/path/with.dots';
    assert.equal(escapeCwd(cwd), escapeCwd(cwd));
  });

  test('escapeCwd truncates and appends a hash for paths over 200 characters', () => {
    const longCwd = '/' + 'a'.repeat(250);
    const result = escapeCwd(longCwd);
    // 200 dashified chars + '-' + a base36 hash suffix.
    assert.ok(result.length > 200 && result.length < 220, `unexpected length ${result.length}`);
    assert.equal(result.slice(0, 200), '-' + 'a'.repeat(199));
    assert.match(result.slice(201), /^[0-9a-z]+$/);
  });

  test('two different long cwds sharing the first 200 chars get different hash suffixes', () => {
    const base = 'a'.repeat(205);
    const cwdA = '/' + base + 'AAAAA';
    const cwdB = '/' + base + 'BBBBB';
    assert.notEqual(escapeCwd(cwdA), escapeCwd(cwdB));
  });

  test('configDir defaults to ~/.claude and respects CLAUDE_CONFIG_DIR', () => {
    const original = process.env.CLAUDE_CONFIG_DIR;
    try {
      delete process.env.CLAUDE_CONFIG_DIR;
      assert.match(configDir(), /\.claude$/);
      process.env.CLAUDE_CONFIG_DIR = '/custom/config/dir';
      assert.equal(configDir(), '/custom/config/dir');
    } finally {
      if (original === undefined) delete process.env.CLAUDE_CONFIG_DIR;
      else process.env.CLAUDE_CONFIG_DIR = original;
    }
  });

  test('transcriptPath is <configDir>/projects/<escaped cwd>/<sessionId>.jsonl', () => {
    const original = process.env.CLAUDE_CONFIG_DIR;
    process.env.CLAUDE_CONFIG_DIR = '/cfg';
    try {
      assert.equal(
        transcriptPath('/a/b', 'session-1'),
        join('/cfg', 'projects', '-a-b', 'session-1.jsonl')
      );
    } finally {
      if (original === undefined) delete process.env.CLAUDE_CONFIG_DIR;
      else process.env.CLAUDE_CONFIG_DIR = original;
    }
  });

  test('transcriptExists: false when missing, false when zero-byte, true when it has content', () => {
    withTempDir((configRoot) => {
      const original = process.env.CLAUDE_CONFIG_DIR;
      process.env.CLAUDE_CONFIG_DIR = configRoot;
      try {
        const cwd = '/a/b';
        assert.equal(transcriptExists(cwd, 'missing-session'), false);

        const dir = join(configRoot, 'projects', escapeCwd(cwd));
        mkdirSync(dir, { recursive: true });
        const emptyPath = join(dir, 'empty-session.jsonl');
        closeSync(openSync(emptyPath, 'w'));
        assert.equal(transcriptExists(cwd, 'empty-session'), false);

        writeFileSync(join(dir, 'real-session.jsonl'), '{"hook_event_name":"SessionStart"}\n');
        assert.equal(transcriptExists(cwd, 'real-session'), true);
      } finally {
        if (original === undefined) delete process.env.CLAUDE_CONFIG_DIR;
        else process.env.CLAUDE_CONFIG_DIR = original;
      }
    });
  });
});
