import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/**
 * Shared helpers for test/live/ — the opt-in suite that spawns a real
 * `claude` CLI process per test. Slow (each call is a real model round
 * trip) and not free, so this is `npm run test:live`, never part of
 * `npm test`/default CI. Requires a working, already-authenticated `claude`
 * on PATH, same requirement every mission's live grading already has.
 *
 * Every call passes --permission-mode bypassPermissions for the same reason
 * testBattery.js does (see docs/DESIGN.md's Tier 3 section): a fresh
 * sandbox gets refused in several different ways otherwise, and these tests
 * always target a disposable temp directory, never a real project.
 */
export function claudeP(cwd, prompt, extraArgs = []) {
  const result = spawnSync('claude', ['-p', prompt, '--permission-mode', 'bypassPermissions', ...extraArgs, '--output-format', 'json'], {
    cwd,
    encoding: 'utf8',
    maxBuffer: 10 * 1024 * 1024,
  });
  if (result.error) throw result.error;
  try {
    return JSON.parse(result.stdout);
  } catch {
    throw new Error(`claude -p did not return parseable JSON.\nstdout: ${result.stdout}\nstderr: ${result.stderr}`);
  }
}

export function withLiveSandbox(fn) {
  const dir = mkdtempSync(join(tmpdir(), 'claude-quest-live-'));
  try {
    return fn(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}
