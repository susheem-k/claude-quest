**What this taught you:** `/model` can do more than switch the current session —
saying you want it saved writes `model` into this project's `.claude/settings.json`,
so anyone working in this project (not just your own user-level settings) gets that
default from then on. It's a project-level configuration file, checked in like any
other, not a personal preference.
