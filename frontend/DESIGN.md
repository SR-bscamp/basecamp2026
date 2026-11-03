# Compass UI — design note

**Three directions considered**
1. *Field Guide*: warm paper, serif headings, a printed-handbook feel. Charming but slow to read on a projector, and numbers look like an afterthought.
2. *Mission Control*: dense dark dashboard, every panel visible at once. Impressive for 5 seconds, then noisy; the chat gets lost.
3. **Instrument (picked)**: a calm dark canvas in the spirit of Linear + Oura. One glanceable **readiness ring** is the hero, the chat is the workbench, and the engine numbers sit in a quiet drawer that slides out when asked.

**Rules for Instrument**
- Each department owns one accent (IT cyan, HR rose, Consultants violet, Finance amber), set as a CSS variable so the whole app re-tints when you switch. Identity through colour, not chrome.
- Soft radial gradient glow behind the ring in the accent colour (Bevel). Everything else is neutral zinc.
- Keyboard-first: ⌘K palette to jump department, open Quality, or ask a suggested question; Enter sends, ⇧Enter for newline.
- Motion is short (150–400 ms) and purposeful: ring sweeps, a checked item pops and strikes through, a group completion pulses.
- Assistant answers are structured cards: reply, numbered steps, citation chips, confidence pill, ticket card, "What I see" for screenshots.
- Numbers get typography: tabular figures, cost shown in fractions of a cent, cache share as a bar. Quality tab uses the same ring language.
- Fixture mode is always honest: a visible "sample data" / "fixture" badge, never disguised as live.
