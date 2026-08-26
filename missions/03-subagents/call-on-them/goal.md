# Call on Them

*Tier 2 — Invocation. This mission requires one real `claude` session, run by you,
under your own account. The engine only reads what happened afterward — it never
grades what Claude said.*

A subagent named `town-crier` is already sitting in this sandbox's `.claude/agents/`.
It doesn't do anything dangerous — it just needs to be *called on* for this mission
to count as complete.

## Goal

Open a real `claude` session in this sandbox and explicitly ask for it by name — for
example: "Use the town-crier subagent to make an announcement."

## Check

`town-crier`'s own instructions include a step that logs its invocation to
`.claude-quest/hook.log`. `check.js` passes when that log shows `town-crier` fired —
proof the delegation actually happened, independent of anything Claude said.
