**What this taught you:** unlike a skill, a subagent's tools are exactly what its
`tools` frontmatter lists — nothing more is implied or inherited from the session
that delegated to it. Widening what it can do means editing that list explicitly,
the opposite direction from a skill (which starts with everything and gets scoped
down via `allowed-tools`). Same underlying idea — tool access is declared, not
assumed — applied from two different starting points.
