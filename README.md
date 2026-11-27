# Code Comprehension

Local quizzes that help engineers understand the code they ship.

## Development

Use Node.js 24.13 or newer and pnpm 10.34.9 (the pinned package manager).

```sh
pnpm install
pnpm build
pnpm start
```

The CLI opens the built UI on a free loopback port. Stop it with Ctrl+C.
For a headless session, use `pnpm start --no-open`; the URL is printed in the terminal.
Use `--port <number>` to choose a port, or omit it to avoid port conflicts.

Load a quiz JSON file to answer single- and multiple-answer questions:

```sh
pnpm start --quiz tests/fixtures/quiz.json
```

The fixture illustrates the [versioned quiz contract](packages/quiz-contract/src/quiz.ts).
Its payment scenario and source references are examples, not descriptions of this repository.
Invalid files produce field-specific errors before the server starts. Submit to see
correct answers and an exact-match score, or retake with cleared selections. The current attempt survives reloads using browser storage; retaking clears it.
Product quizzes use local storage; PR quizzes use tab-session storage.
Only one current attempt is retained, with no score history. Changed quiz content starts
a fresh attempt. Storage belongs to the local URL (including its port), so restarting
the CLI on another port starts fresh. If browser storage is unavailable, the quiz
continues in memory. After submission, each question shows its concise explanation with a keyboard-accessible
control for the detailed version. Supporting code locations are selectable repository-relative
paths, with line numbers when supplied, for opening in your editor.
Optional Mermaid diagrams render locally on demand; invalid diagrams show recovery copy
and inspectable source without blocking the explanation. Retaking resets explanation
controls to concise mode.
The [PR quiz skill and runtime workflow](docs/pr-quiz.md) now support agent-generated
PR assessments. The [product quiz workflow](docs/product-quiz.md) supports first-run
setup and single-module, combined-module, or general system architecture assessments. Content-based cache reuse and varied product retakes are supported. Changed sources require agent review before retention or regeneration. Published runtime bootstrapping remains in a subsequent ticket.

See the [UI SDK evaluation](docs/ui-sdk-evaluation.md) for the native-control decision.

## Workspace

### Live UI development

```sh
pnpm dev --quiz tests/fixtures/mixed-quiz.json
```

This builds the CLI once, then serves the Vue source through Vite on the quiz's
own loopback address. Style/template edits update automatically; changes that need
a page reload restore the current answers from browser storage. The quiz server,
question selection, revision, and review attempt stay alive. Keep the same tab and
URL, and allow browser storage for reload persistence.

Use the usual launch arguments for a real assessment, for example
`pnpm dev --product-bank general-overview --repo . --format mixed`.
For an already-built runtime, append `--dev-ui apps/web` to a launch command or to
`--resume-review SESSION_FILE` when resuming an interrupted session. Development
mode must be selected when starting the runtime; refreshing a production-mode
server does not enable it. Do not stop a quiz normally to migrate it: normal shutdown
deletes its recovery record.

Vite and the UI source are needed only in this development checkout. Normal
`pnpm start` and packaged CLI launches still serve prebuilt assets. Server/CLI edits
require a rebuild and restart; live updates apply to browser code only.

- `apps/web`: Vue 3 UI, built with Vite and Tailwind.
- `packages/cli`: Commander CLI and local HTTP server.
- `packages/quiz-contract`: shared runtime/quiz contracts consumed by both applications.

Keep runtime responsibilities in focused modules. The shared contract has no
Vue or Node dependencies. The production CLI bundles internal workspace code;
its runtime dependencies and prebuilt web assets travel with the npm package.

See [CONTRIBUTING.md](CONTRIBUTING.md) for code-quality expectations. Browser copy
lives in an English message catalog; this is not yet multi-language support.

## Checks

```sh
pnpm typecheck
pnpm test
```

`pnpm test` builds the application, runs Vitest integration tests, then runs
Playwright against the actual built CLI. Install Chromium once before browser tests:

```sh
pnpm exec playwright install chromium
```

For a focused loop after building, run `pnpm test:unit` or `pnpm test:e2e`.

## Packaging

```sh
pnpm pack:cli
```

This produces `artifacts/code-comprehension.tgz`, containing the executable and
compiled UI. A consuming project does not need Vue, Vite, or a frontend build.
The package remains private until the distribution milestone establishes its
published name and release process.

Active quizzes support question challenges and scope/difficulty refinements through
the existing agent chat. The agent can inspect displayed question IDs and validate a
replacement; the engineer reloads to start the revised attempt. See the
[revision workflow](skills/pr-quiz/references/revisions.md).

## Voice input

Written answers support optional browser dictation without API keys. Click the mic,
allow microphone access, and speak. The recording pill shows microphone activity;
Stop returns to the editor and appends recognised words to the existing answer.
Cancel (× or Escape) discards that recording. You can edit the resulting text before
submitting. Only one question records at a time, and quiz submission waits until
recording is stopped or cancelled.

This uses the browser's Web Speech recognition service, which may send audio to its
provider and require internet access. No audio is uploaded to our CLI or stored in
question banks. Support varies by browser; unavailable recognition, denied permission,
and service errors leave typing available. If the browser ends recording unexpectedly,
completed words are retained with a notice. Actual recognition accuracy depends on
the browser, microphone, language, and connection; automated tests exercise the UI
with simulated recognition events rather than a live speech provider.

Dictation requests native automatic punctuation when the browser exposes
`unspokenPunctuation`. Actual punctuation quality depends on the browser's speech
engine; exposing the setting does not guarantee it is honoured. Other browsers keep
the existing transcription behaviour. Returned punctuation is preserved, with no
punctuation model or rule-based rewriting added.

## PR explainers

Use `/pr-explainer` for a silent, code-grounded walkthrough before or independently
of `/pr-quiz`. See the [PR explainer workflow](docs/pr-explainer.md) for runtime
availability, preparation, validation, and temporary-session cleanup.

Use `/product-explainer` to learn one or more modules or **General system architecture**
without first taking a quiz or configuring question-bank storage. See the
[product explainer workflow](docs/product-explainer.md).
