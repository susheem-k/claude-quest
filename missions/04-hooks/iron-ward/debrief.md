**What this taught you:** a hook's `matcher` field decides which tool it even
watches — get it wrong and the hook silently never runs, correct logic or not. This
mirrors the description-precision lesson from skills and subagents, but the failure
mode is different in kind: a bad skill description makes Claude *sometimes* choose
wrong; a bad matcher makes the hook categorically never fire, with no judgment call
involved anywhere — it's a wiring bug, not an ambiguity.
