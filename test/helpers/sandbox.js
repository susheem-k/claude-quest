import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/**
 * Shared helpers for unit tests: a disposable directory standing in for a
 * mission sandbox or a claude-quest root, cleaned up unconditionally
 * afterward. Every unit test in this repo constructs its own filesystem
 * state directly rather than going through provision()/setup.js, since the
 * point is testing check.js and the engine in isolation, not re-testing
 * setup.js itself (setup.js correctness is exercised by the mission's own
 * live test, where one exists).
 */
export function withTempDir(fn) {
  const dir = mkdtempSync(join(tmpdir(), 'claude-quest-test-'));
  try {
    return fn(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

export async function withTempDirAsync(fn) {
  const dir = mkdtempSync(join(tmpdir(), 'claude-quest-test-'));
  try {
    return await fn(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}
