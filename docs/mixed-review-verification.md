# Mixed review lifecycle verification

## Codex verification — 2026-11-24

Codex exercised the real CLI, waiting-review transport, and built browser UI with a
four-question assessment grounded in this repository: two MCQs and two written
questions about review leases and retake recovery. Chromium automation supplied
seeded answers; Codex read the supporting code and authored both reviews. This was
an agent integration check, not a human usability study.

Observed:

- One browser submission delivered the first answers to Codex through `--wait-review`.
  MCQs scored locally; written feedback appeared per question without a chat trigger.
- Clicking Retake cleared answers and feedback. The next browser submission had a
  new attempt and submission identity while keeping the session/revision.
- Re-delivering the first attempt's feedback failed with a stale-review error.
- The waiting loop delivered the second attempt automatically. Codex returned
  different qualitative outcomes for deliberately weaker seeded answers; those
  appeared both below the questions and in the navigator.
- Normal shutdown removed the private session. Temporary verification inputs and
  feedback were deleted; no answers or history were added to product banks.

Automated integration/Playwright tests additionally cover retaking during review,
fresh mixed draws, lost retake acknowledgements, reload/resume, identical-text
replacement, idempotent current feedback, subsequent waiting delivery, and closure.

## Claude Code manual release check — ticket #11

Claude Code compatibility is **not yet verified**. Use the release candidate checkout
and its documented local runtime resolution; no API key or new account is required.

1. Build with `pnpm build`, then open this repository in Claude Code with the
   `product-quiz` and `pr-quiz` skills available. Record the Claude Code version,
   operating system, and candidate commit in #11.
2. Ask: “Use product-quiz for a general system architecture with four questions, mixed: two MCQs
   and two written responses.” For fresh-draw verification, ask for a grounded bank
   containing at least three useful questions of each type. Record the printed local
   URL and private review-session path privately; never paste credentials into #11.
3. Confirm Claude starts `RUNTIME --wait-review SESSION_FILE` in its active turn and
   continues when output arrives. Fill the browser and submit once. Verify immediate
   per-question MCQ feedback, conspicuous written-review status, and automatic
   per-question written feedback without a chat readiness/review message.
4. Click Retake while a written review is pending. Verify cleared answers, feedback,
   and score; requested format/count remain unchanged. Submit different answers and
   confirm Claude receives the new attempt. Superseded feedback must not appear.
5. Retake again after feedback. Verify available fresh questions are prioritised.
   A small bank may repeat questions; it must not promise unseen questions. Reload
   during the new attempt and verify the selected draw and draft survive.
6. Ask Claude to replace the current assessment with the same question text through
   the revision workflow. The old form must remain visible until you reload; after
   reload it must be an empty attempt with no old feedback. A malformed proposal
   must leave the current assessment usable.
7. Stop only Claude's waiting reviewer, keeping the runtime alive. Submit an attempt;
   after its bounded lease expires, verify disconnected-reviewer guidance. Say
   “Reconnect to my quiz” in Claude chat. It must retrieve current work without a
   second browser submission or fresh scope/format selection.
8. For runtime recovery, interrupt the dedicated quiz process without graceful
   closure, then ask Claude to run `RUNTIME --resume-review SESSION_FILE` and wait
   again. Verify the same URL/attempt and pending answers or completed feedback.
   Normal SIGINT/SIGTERM intentionally closes and deletes the session, so it is
   unsuitable for this interruption check.
9. Run a PR quiz with mixed questions. Retake and confirm it retains the PR's session
   questions. Close the quiz normally; verify the runtime exits and private recovery
   and PR temporary files are removed. Product banks must remain available.

Record observed results and any host-specific inability to keep a command/turn active
in #11. Do not claim support solely because Claude can read the skill instructions.
