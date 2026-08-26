**What this taught you:** a skill inherits every tool the current session has by
default — nothing about "creating a skill" grants it Bash, it already had access.
`allowed-tools` in a skill's frontmatter is how you scope that down on purpose,
the same idea as a subagent's `tools:` list, just opt-out instead of opt-in. Real
work (reading a file, updating it, writing it back) happens through the same Bash
tool a skill already used for its self-log step — there's no separate "skills can
do real things" mechanism to learn, it's the same tool used for more than logging.
