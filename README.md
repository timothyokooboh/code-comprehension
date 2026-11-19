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
correct answers and an exact-match score, or retake with cleared selections. Reloading
also clears the attempt; scores are never saved. Explanations, references, and optional
Mermaid diagrams are accepted as assessment data; their display arrives in ticket #4.
Quiz generation and installable agent skills arrive in subsequent tickets.

See the [UI SDK evaluation](docs/ui-sdk-evaluation.md) for the native-control decision.

## Workspace

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
