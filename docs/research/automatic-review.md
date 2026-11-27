# Automatic written-answer review: integration research

Researched 2026-11-23. Documentation and local version/help inspection only; no model runs, authentication changes, or review implementation. See [Claude-specific findings](automatic-review-claude.md) for detailed citations and constraints.

## Decision to make

The desired experience is browser submission followed by automatic, evidence-grounded feedback, including mixed MCQ/written assessments. This does not inherently require the same conversation that generated the questions to perform grading. Separate the generator, the quiz runtime, and the reviewer.

Recommendation: prototype an application-owned review worker using supported non-interactive agent entry points, behind a small versioned review-provider contract. Use the existing agent to generate the questions, expected key points, and cited evidence. Do not require every coding-agent host to support inbound events. Existing-session integrations can remain optional adapters.

## Confirmed Codex capabilities

- `codex exec` supports non-interactive jobs, structured output through `--output-schema`, JSONL events, and ephemeral runs. It reuses saved CLI authentication by default and supports restricted execution. This is a supported basis for a dedicated review job; it is not a documented way to inject work into an arbitrary open desktop conversation. [Non-interactive mode](https://developers.openai.com/codex/noninteractive)
- The TypeScript SDK starts, continues, and resumes local threads. OpenAI positions SDK use for automation and app-server for richer custom clients. SDK support does not establish that attaching concurrently to an arbitrary desktop session is safe. [Codex SDK](https://learn.chatgpt.com/docs/codex-sdk)
- App-server documents initialization, `thread/start`, `thread/resume`, `turn/start`, streamed notifications, interruption, per-turn output schema, and approval handling. Stdio is its default transport. The page labels TCP WebSocket transport experimental and unsupported. For a worker we own, stdio avoids adding a second exposed listener. [App-server](https://learn.chatgpt.com/docs/app-server)
- Codex's MCP documentation describes tools and server instructions and a default tool timeout of 60 seconds. It does not establish a universal unsolicited-event-to-local-conversation mechanism. A held tool can return submissions to a currently running turn, but its timeout, cancellation, and continued renewal must be validated. [MCP configuration](https://learn.chatgpt.com/docs/extend/mcp?surface=cli)
- OpenAI also documents MCP Events, but its stated availability is Work chats on web, Work/Cloud in desktop, and dots. This is not evidence that arbitrary local Codex chats accept those events. The integration uses authenticated remote MCP plus HTTPS callback delivery. [MCP Events](https://developers.openai.com/plugins/build/mcp-events)

## Confirmed Claude paths

Claude documents `claude -p` for non-interactive runs and structured JSON output, plus Agent SDK orchestration. Channels are the more direct existing-session route but carry preview, launch/configuration, account, and organizational constraints. A custom channel is not a universally available capability just because an agent supports MCP. See the companion research note for precise eligibility and current protocol limitations. [Programmatic use](https://code.claude.com/docs/en/headless), [Channels](https://code.claude.com/docs/en/channels).

## Local compatibility observations

Read-only checks on this machine reported Codex CLI 0.139.0 and Claude Code 2.0.76. Both installed help outputs expose non-interactive operation and JSON-schema-constrained output. Codex exposes `--sandbox read-only` and `--ephemeral`; Claude exposes `--tools`, `--strict-mcp-config`, `--setting-sources`, and `--no-session-persistence`. The installed Claude help does not list channels or bare mode. Current online docs must not be treated as a capability guarantee for these installed versions.

No inference request was made. Account eligibility, usage billing, actual tool permissions, transport lifetimes, and disconnect behavior remain untested. Installed commands do not prove successful authentication or availability of a chosen model.

## Options and tradeoffs (design assessment)

| Approach | Benefit | Limit |
| --- | --- | --- |
| Existing session with channel/event adapter | Keeps conversation context and current agent | Host/version-specific delivery, busy-session conflicts, lifecycle coupling |
| Instruction-directed waiting tool | Can use existing shell/MCP capabilities without a separate model API | Agent must keep the turn alive; tool timeouts, cancellation, and polling vary; not universal background delivery |
| Dedicated CLI/SDK review worker | Browser submits automatically; runtime owns jobs, cancellation, output and retries | Supported provider executable/auth required; additional inference usage and maintenance per adapter |
| Direct model API reviewer | Decouples grading from every coding agent; can grade a bounded evidence package without tools | Separate credentials/provider setup and usage; needs enough evidence to avoid brittle grading |
| Write then reveal evidence/self-review | Works with every generator; no live reviewer or additional inference | No independent personalized assessment; label it self-review |

A dedicated worker is a modification of the proposed browser → CLI → agent approach: replace the user's active chat with a reviewer process controlled by the runtime. A direct API reviewer removes coding-agent integration altogether. For the API approach, keep credentials server-side and pass bounded source evidence, not unrestricted browser-selected files. Neither approach guarantees semantic accuracy merely by returning valid JSON.

## Instructions versus maintained integration

Skills should explain how to select an installed supported adapter, prepare the review package, start the quiz, and repair malformed content. They should not ask each engineer's agent to invent a bridge, mutate global configuration, disable permissions, scrape desktop internals, or guess how another host wakes up.

A command such as `wait-for-submission` could support a bounded interactive experiment: the current agent starts a tool call, the tool returns a submission when available, the agent grades and calls `submit-feedback`. This is a proposal, not a verified compatibility claim. It requires actual runtime code and a live turn; instructions cannot revive a finished turn or a closed host. Repeated empty tool results may add model turns and usage. Never promise a zero-cost permanent listener.

## Proposed review contract and controls

These are proposed requirements, not existing features:

- Input: session/assessment revision, submission ID, question, expected key points, acceptable alternatives, source references and bounded evidence snapshot, and learner response.
- Output: matching submission IDs, Correct / Partly correct / Needs correction / Could not assess, brief supported/missing/incorrect points, and allowed evidence references.
- Treat learner text and repository content as data, never executable commands or authority to change permissions. Use fixed process arguments and structured stdin rather than shell interpolation.
- Grant only required source reads. Disable edits, general shell execution, unrelated MCP tools, hooks, and ambient configuration where supported; fail capability checks rather than bypass protections. Read-only filesystem mode alone is not a full guarantee about hooks, tools, network, or inherited secrets.
- Use loopback endpoints with session authorization, origin/host checks, body limits, and revision binding. Do not expose a general agent-command endpoint to the browser.
- Keep answers locally recoverable, separate from reusable banks and permanent score history. Persist only what recovery needs; set an explicit cleanup lifecycle.
- Detect missing executable, unsupported version, missing auth, approval requirement, quota/rate limit, deadline, worker exit, malformed feedback, stale source, cancellation, and duplicate submission separately.
- A failed review is pending/failed, never an incorrect answer. MCQ results remain independently available.
- Bound repair/retry attempts and usage. Retries can incur extra inference even if the UI applies a result only once. Ignore late results for superseded attempts.
- Do not promise survival after quitting the parent agent unless runtime process independence has actually been tested on the target OS.

## Smallest useful validation experiment

Before a full feature, test one written answer through each supported worker adapter. Supply a small immutable evidence bundle, restrict capabilities, require structured feedback, and return it to the browser. Verify paraphrases, valid alternative reasoning, incorrect answers, insufficient evidence, prompt-injection attempts, auth failure, timeout, cancellation, malformed output, duplicate submits, source changes, and recovery after the host/runtime exits. Use a small curated set of human-reviewed answers to evaluate semantic quality, not merely JSON shape.

For agents without a supported execution API, generation can still work through the skill. Automatic grading requires a separately chosen supported reviewer or an explicit self-review mode. Do not market this as automatic review inside every coding agent.
