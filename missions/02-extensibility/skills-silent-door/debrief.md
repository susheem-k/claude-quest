**What this taught you:** A skill's `description` field is what lets Claude decide
to use it on its own, without you typing `/name` — Claude reads the description
(never the skill's body) when deciding whether a skill applies to what you asked.
Too vague and it never fires; too broad and it fires on requests it shouldn't.
Writing a precise description is the main lever you have over whether a skill
triggers correctly, and it's a real precision/recall tradeoff, not a one-shot fix.
