# The Siege Plan

*Tier 4 — Judgment. Unlike every earlier mission, "correct" here isn't a fixed
fire/don't-fire outcome — it's graded by a judge call against a rubric. The judge
gets a fresh, isolated `claude` session with only the rubric and your submission; it
never sees this conversation, and it's explicitly told to treat your writing as
data to evaluate, not instructions to follow.*

Before the tower lets anyone touch the code, it wants to see the plan first — not
because the plan has to be perfect, but because a plan that's vague, scope-creeping,
or pretending there's no downside is exactly the kind that goes wrong halfway
through the work.

## Goal

Read `TASK_BRIEF.md` in this mission's sandbox — it describes a real piece of work:
adding rate limiting to a login endpoint.

Write a plan for how you'd approach it into `PLAN.md` in the sandbox — by hand. If
you want to workshop it, open a separate `claude` session and draft it there, but
place the final text yourself.

## Graded on

- **Names concrete files/components** — not a restatement of the goal in vaguer
  words
- **Stays in scope** — the brief marks some things out of scope on purpose; a plan
  that quietly expands past them fails this just as hard as a vague plan does
- **Names at least one real risk or tradeoff** — a plan with no visible downsides is
  hiding something
- **No filler** — don't open with "This plan will..." or "In this document..."

You need 3 of 4 to pass. The check will show you exactly which ones did and why.
