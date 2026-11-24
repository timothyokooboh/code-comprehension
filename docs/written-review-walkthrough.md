# Codex workflow verification — 24 November 2026

This was an agent-run test with seeded answers, not an engineer knowledge assessment.
The active Codex turn used the production CLI and Vue application, not the prototype.

1. Generated a four-question bank from the current cache, selection, formatting and
   waiting-agent implementation: two MCQs and two written questions with criteria
   and code references.
2. Validated and saved the dedicated local test bank; a mixed-format cache check
   reported reusable. Launched with --format mixed --questions 4 --written-questions 2.
3. Started --wait-review before browser submission. Playwright submitted labelled
   seeded answers through the real form. MCQs immediately reported 2/2.
4. The running command delivered the submitted written answers to the active Codex
   turn without a chat trigger. Codex read the cited implementation and authored
   structured feedback: Correct for the format/sampling explanation; Needs correction
   for the claim that a CLI process could wake an ended agent turn.
5. Sent feedback through --review-feedback. A browser verification opened the existing
   session and confirmed the expected per-question feedback. Automatic updates in an
   already-open page are additionally covered by the mixed-review Playwright test.
6. Started --wait-review again after feedback: it remained quiet and active instead
   of repeatedly emitting completed. Gracefully stopped the test server and removed
   the dedicated test bank and temporary feedback/input files.

No provider SDK, extra API keys, new account, MCP installation or application model
API was used. The coding agent's existing inference session performed evaluation.

## Limits and release check

- This verifies Codex's active-turn command workflow, not universal host compatibility.
- Browser submission was seeded by automation; review prose was produced by this live
  Codex turn after reading evidence, not a scripted reviewer response.
- Skill-driven generation is guidance plus deterministic runtime validation; automated
  tests cannot prove every host will follow the instructions or generate factual content.
- Runtime-restart recovery (#26) and mixed retakes/replacement (#27) remain separate.
- Claude Code remains untested. Before announcement, the engineer should invoke each
  skill with an explicit mixed request, confirm no chat readiness trigger, submit in
  the browser, observe inline review, interrupt/reconnect the reviewer while the runtime
  remains alive, and record the host/version and actual outcomes.
