**What this taught you:** the same lesson as a skill's description, applied to
delegation instead of invocation — a subagent's `description` is what Claude reads
to decide whether spawning it is warranted for a given request, without being asked
by name. Too thin a description doesn't just risk under-triggering; it also doesn't
give Claude enough signal to reliably avoid delegating on requests that have nothing
to do with what the subagent is actually for.
