# Automatic written-answer review: Claude and MCP

Research checked 2026-11-23 against official documentation. This is an architectural investigation, not an implementation or an installed-version compatibility test.

## Existing interactive Claude Code session

**Documented:** Channels deliver external events to the open Claude Code session. They remain a research preview, require Anthropic authentication (claude.ai or Console API key), and are unavailable on Bedrock, Google Cloud’s Agent Platform, and Microsoft Foundry. Team/Enterprise administrators must enable them. The session must remain open; this is not an offline delivery guarantee. [Channels](https://code.claude.com/docs/en/channels)

**Documented:** A custom channel is a local stdio MCP subprocess declaring `claude/channel` and sending `notifications/claude/channel`. It can accept local HTTP submissions and expose a reply tool. Events queue; multiple events arriving during work can be grouped into the next turn. Custom channels currently require `--dangerously-load-development-channels server:<name>`, interactive confirmation, and MCP configuration. That development flag is ignored with `-p`. [Channel contract and example](https://code.claude.com/docs/en/channels-reference), [CLI flags](https://code.claude.com/docs/en/cli-reference)

**Inference:** This supports a browser-submit → local server → existing Claude session → review-result tool → browser flow. It preserves conversational context, but needs explicit setup and a live channel-enabled session. Use a submission identifier and version in every event/result because notifications can be grouped. It is a Claude-specific adapter, not an MCP-wide promise that any idle assistant can be awakened.

## Headless worker and Agent SDK

**Documented:** `claude -p` runs noninteractively, accepts stdin, and supports `--output-format json --json-schema ...`. Schema output appears in `structured_output`; it can be absent, including when the model declines. Ordinary `-p` loads project/user customizations. `--bare` skips discovery and does not read subscription OAuth credentials: use API/provider credentials. [Programmatic execution](https://code.claude.com/docs/en/headless)

**Documented:** `--allowedTools` preapproves tools; it is not an availability restriction. `--tools` restricts built-in tools, including `--tools ""` to disable them. MCP tools require separate control, such as `--disallowedTools "mcp__*"`. `--resume` supports saved conversations; current background-session handling has special attachment semantics. Do not equate ordinary resume with arbitrary injection into every running terminal session. [CLI reference](https://code.claude.com/docs/en/cli-reference)

**Recommendation/inference:** For assessment using already assembled question, rubric, evidence, and answer, use a no-tool worker and validate its result before persistence. If repository reading is needed, expose only explicitly required read tools and constrain paths. A read-only instruction is weaker than removing write/command tools. Launch using an argument array and stdin rather than concatenating learner answers into shell commands. The application should own retries, deadlines, cancellation, and accepted result versions.

**Documented:** The Agent SDK runs Claude Code’s agent through a library in an application-owned process. It is distinct from calling a model API directly. [SDK overview](https://code.claude.com/docs/en/agent-sdk/overview)

**Documented:** Streaming input keeps an SDK session open. TypeScript accepts an async generator of user messages; Python uses `ClaudeSDKClient`. To obtain one response per submission, wait for the previous result before sending the next. Messages sent during tool execution can be answered together. These APIs control the SDK session the app owns; the page does not document attaching to arbitrary existing terminal processes. [Streaming input](https://code.claude.com/docs/en/agent-sdk/streaming-vs-single-mode)

**Documented:** The SDK quickstart uses an API key or supported provider credentials. It explicitly says third-party developers may not offer claude.ai login/rate limits in their products without prior approval. Do not assume an embedded commercial integration can reuse consumer login merely because the local interactive CLI can. [SDK authentication](https://code.claude.com/docs/en/agent-sdk/quickstart)

## MCP is not a universal agent wake-up API

**Documented:** MCP 2025-11-25 sampling requires the client to advertise sampling capability; the client controls model access and permissions. Context inclusion is optional and already soft-deprecated. A model completion returned through sampling is not documented as a new turn in the user's existing conversation. [2025 sampling specification](https://modelcontextprotocol.io/specification/2025-11-25/client/sampling)

**Documented:** The 2026-07-28 specification deprecates sampling, recommends new implementations avoid it, and recommends direct provider APIs. Its flow embeds a sampling input request in `InputRequiredResult` while processing a client request. Version-specific behavior matters; do not assume historical server-to-client sampling support in every current host. [2026 sampling specification](https://modelcontextprotocol.io/specification/2026-07-28/client/sampling)

**Documented:** The 2025 HTTP transport can carry notifications and requests; POST-stream messages should relate to the originating request, and an optional GET stream can carry unrelated messages. Transport delivery alone does not define an assistant turn. [2025 transport specification](https://modelcontextprotocol.io/specification/2025-11-25/basic/transports)

**Inference:** A generic MCP tool can fetch a pending answer or save a review once an agent chooses to invoke it. Resource/list-change notifications do not establish universal autonomous review behavior. Capability negotiation and host-specific behavior must be checked rather than assuming MCP installation is sufficient.

## Instructions-only waiting loop

**Inference:** A skill can instruct an already active agent to call a blocking `wait_for_submission` tool, review its returned answer, call `save_review`, and wait again. This is a plausible portable prototype for hosts that support long-running tools. It still requires a real queue/tool implementation and an initially active turn. Instructions cannot create an execution trigger after the assistant ends its turn. Host timeouts, cancellation, approvals, compaction, and process shutdown can break the loop; this is not a guaranteed always-on service.

For Claude specifically, the documented Channels mechanism is the stronger existing-session path; SDK streaming input is the stronger app-owned persistent-worker path. The distinction follows their documented event and lifecycle contracts, not an experimentally verified claim about every host. [Channels](https://code.claude.com/docs/en/channels), [SDK streaming input](https://code.claude.com/docs/en/agent-sdk/streaming-vs-single-mode)

## Recommendation

Keep the browser and review domain provider-independent: submit an immutable answer revision, queue a review request, and accept a validated review tied to that revision. Implement separate adapters for app-owned CLI/SDK workers, supported existing-session channels, and an explicit manual/waiting-tool fallback. Prefer the worker adapter when reliable automatic submission handling matters; offer existing-session reuse where its host explicitly supports it. For a self-contained rubric assessment, a direct model API is another simpler worker option when repository tools and agent context are unnecessary.

The application should display waiting, reviewing, completed, failed, and disconnected states from its own request lifecycle. Do not present a successful notification send as completed review, or accept stale results after an answer changes. These are design recommendations, not protocol guarantees.
