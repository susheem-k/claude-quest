import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

export function setup(sandboxDir) {
  // Deliberately mundane content and filename — a live session sometimes
  // refuses to touch anything that *sounds* precious or secret on its own
  // judgment, even under a direct instruction (confirmed live while
  // building this arc: a file literally named secrets.txt with fake
  // credentials in it got a real claude session to decline reading it,
  // which made grading flaky for reasons that had nothing to do with
  // whether the hook worked). The hook has to be what's under test here,
  // not the model's own caution.
  writeFileSync(join(sandboxDir, 'diary.txt'), 'Nothing interesting happened today.\n');
}
