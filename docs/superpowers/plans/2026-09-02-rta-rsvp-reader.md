# RTA RSVP Reader Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a standalone, governed RTA application whose control-only CLI drives a fixed-focus RSVP display over local WebSockets.

**Architecture:** A server-authoritative `ReadingSession` aggregate and deadline scheduler run behind RTA commands, ports, and named runtime profiles. The Node server serves a passive React display and exposes separate control and display WebSocket paths; the thin CLI dispatches through an RTA profile backed by filesystem, WebSocket-client, and process-supervisor adapters.

**Tech Stack:** Node.js 22, TypeScript, Effect, `@siderealmollusk/rta` 0.6.0 from `https://packages.autopoiesis.nexus/`, React 18, Vite 7.3.6, `@vitejs/plugin-react` 5.2.0, `ws`, Node test runner, Playwright, GitHub Actions.

## Global Constraints

- The browser surface contains no interactive controls or status UI.
- Cadence is always constant at the selected WPM; punctuation never changes a frame duration.
- Bind HTTP and WebSocket listeners to `127.0.0.1`; default port is `4173`.
- Reading-session state is memory-only and resets on server restart.
- Text content enters through files read by the CLI; ship deterministic sample `.txt` files.
- All filesystem, network, process, environment, and clock effects use declared RTA ports and formal adapters.
- The CLI only parses, dispatches, renders, and chooses exit status.
- Keep user document text out of evidence and logs.
- Use the exact released RTA dependency resolved in `package-lock.json`; never link a local RTA checkout.
- After every cohesive edit, run the focused test and `npm run check:fast`.

---

## Locked file map

Generated RTA ownership is preserved for `.rta/`, `domains/`, `runtimes/`, `src/core/context.ts`, `src/runtime/`, `src/browser/`, the managed web contract, and GitHub CI. Application-owned behavior is divided as follows:

```text
src/core/reading-session.ts                  pure aggregate and public snapshot
src/core/tokenize.ts                         deterministic whitespace tokenizer
src/core/orp.ts                              Unicode ORP split
src/core/messages/*.ts                       generated RTA command/query declarations
src/core/use-cases/*.ts                      command sequencing and validation
src/core/ports/*.ts                          session, display, cadence, control, text, process ports
src/adapters/memory-reading-session.ts       in-memory session repository
src/adapters/node-cadence-scheduler.ts       monotonic deadline scheduler
src/adapters/ws-display-publisher.ts         broadcast adapter
src/adapters/ws-control-client.ts            CLI control transport
src/adapters/node-text-source.ts             bounded UTF-8 file reader
src/adapters/node-process-supervisor.ts      detached server lifecycle and runtime files
src/server/protocol.ts                       versioned control/display codecs
src/server/create-server.ts                  HTTP/static/upgrade host adapter
src/entrypoints/server.ts                    server composition and signal shutdown
src/entrypoints/cli.ts                       argument parser, dispatch, renderer, exit status
src/frontends/web/display-client.ts          reconnecting passive display socket
src/frontends/web/app/main.tsx               React mount only
src/frontends/web/app/ReaderDisplay.tsx      frame renderer
src/frontends/web/app/reader.css             AR-safe target visuals
samples/meditation.txt                       calm reference passage
samples/technology.txt                       technical vocabulary passage
samples/punctuation.txt                      cadence regression passage
test/**/*.test.ts                            focused unit and adapter tests
test/integration/*.test.ts                   real local process/socket tests
test/e2e/*.spec.ts                           browser rendering proof
```

### Task 1: Establish the governed application and dependency provenance

**Files:**
- Create through generator: `.rta/app.json`, `.npmrc`, `package.json`, `package-lock.json`, `domains/main/domain.yaml`, `runtimes/browser.yaml`, `src/core/context.ts`, `src/runtime/application.ts`, `src/browser/**`, `src/frontends/web/**`, `.github/workflows/ci.yml`
- Create: `README.md`, `LICENSE` only if visibility/licensing is later requested
- Modify: `.gitignore`, `package.json`, `vite.config.ts`
- Test: generated `test/**/*.test.ts`

**Interfaces:**
- Consumes: `rta app new rta-rsvp-reader --kind web --destination <repo-root>` from `/Users/virgil/Developer/rta-next`.
- Produces: a stamped `rta-paved-road-v1` application with exact `@siderealmollusk/rta@0.6.0` dependency and scripts `check:fast`, `build:web`, `start`, and `rsvp`. The active `/Users/virgil/Developer/rta-next` CLI owns local standalone-root generation and doctor checks until that support is present in a released CLI.

- [ ] **Step 1: Generate the application into the initialized repository.**

```bash
cd /Users/virgil/Developer/rta-next
node --import tsx scripts/rta.ts app new rta-rsvp-reader --kind web --destination /Users/virgil/Documents/Codex/2026-09-02/i-need-you-to-reach-speed/rta-rsvp-reader
```

Expected: `created web application rta-rsvp-reader` and no overwrite refusal.

- [ ] **Step 2: Install only released dependencies and record provenance.**

```bash
cd /Users/virgil/Documents/Codex/2026-09-02/i-need-you-to-reach-speed/rta-rsvp-reader
npm install ws react react-dom
npm install --save-dev @types/ws @types/react@18 @types/react-dom@18 @vitejs/plugin-react@5.2.0 playwright vite@7.3.6
npm ls @siderealmollusk/rta effect ws react vite
npm view @siderealmollusk/rta@0.6.0 dist.integrity --registry=https://packages.autopoiesis.nexus/
```

Expected: one non-linked RTA 0.6.0 tree and integrity `sha512-y6w2rm9A9vkZMZG9dW2cSIxfBWZa46R1DLROhG3cXoCFl5QwcczLAGaFgMmfTTGr/WAnsLmBUk+HlbKhvAhsQg==`.

- [ ] **Step 3: Add operational ignores and scripts.**

```json
{
  "bin": { "rsvp": "./dist/entrypoints/cli.js" },
  "scripts": {
    "build": "npm run build:web && tsc -p tsconfig.server.json",
    "build:web": "vite build --outDir dist/web",
    "check:fast": "npm run typecheck && npm test",
    "start": "node dist/entrypoints/server.js",
    "dev:server": "node --import tsx src/entrypoints/server.ts"
  }
}
```

Append `/runtime/`, `/dist/`, and `/playwright-report/` to `.gitignore`; configure Vite React and WebSocket-safe development proxying without placing policy in the component tree.

- [ ] **Step 4: Prove the untouched generated baseline.**

```bash
npm run typecheck
npm test
node --import tsx /Users/virgil/Developer/rta-next/scripts/rta.ts app inspect rta-rsvp-reader --repo-root .. --json
```

Expected: typecheck/tests pass and inspection reports `governed: true`, current web contract, and no errors.

- [ ] **Step 5: Commit the governed baseline.**

```bash
git add .
git commit -m "chore: scaffold governed RSVP reader"
```

### Task 2: Model the reading session, tokenizer, and fixed recognition point

**Files:**
- Create: `src/core/reading-session.ts`, `src/core/tokenize.ts`, `src/core/orp.ts`
- Create: `test/core/reading-session.test.ts`, `test/core/tokenize.test.ts`, `test/core/orp.test.ts`
- Generate then implement: `src/core/messages/set-text.ts`, `set-speed.ts`, `play.ts`, `pause.ts`, `stop.ts`, `status.ts`
- Generate then implement: `src/core/use-cases/set-text.ts`, `set-speed.ts`, `play.ts`, `pause.ts`, `stop.ts`, `status.ts`

**Interfaces:**
- Consumes: RTA `Main.command`, `Main.query`, use-case artifacts, and exact `finish` semantics from the generated context.
- Produces: `ReadingSession`, `ReadingSnapshot`, `DisplayFrame`, `tokenize(text)`, `splitAtOrp(token)`, and typed registered operations `main.set-text`, `main.set-speed`, `main.play`, `main.pause`, `main.stop`, `main.status`.

- [ ] **Step 1: Generate message/use-case seams using the RTA CLI.**

```bash
node --import tsx /Users/virgil/Developer/rta-next/scripts/rta.ts app add rta-rsvp-reader command "Set Text" --repo-root .. --domain main
node --import tsx /Users/virgil/Developer/rta-next/scripts/rta.ts app add rta-rsvp-reader command "Set Speed" --repo-root .. --domain main
node --import tsx /Users/virgil/Developer/rta-next/scripts/rta.ts app add rta-rsvp-reader command Play --repo-root .. --domain main
node --import tsx /Users/virgil/Developer/rta-next/scripts/rta.ts app add rta-rsvp-reader command Pause --repo-root .. --domain main
node --import tsx /Users/virgil/Developer/rta-next/scripts/rta.ts app add rta-rsvp-reader command Stop --repo-root .. --domain main
node --import tsx /Users/virgil/Developer/rta-next/scripts/rta.ts app add rta-rsvp-reader query Status --repo-root .. --domain main
node --import tsx /Users/virgil/Developer/rta-next/scripts/rta.ts app sync . frontend web
```

Expected: descriptors and managed web contract include all six operations.

- [ ] **Step 2: Write failing tokenizer and ORP tests.**

```ts
assert.deepEqual(tokenize("  One\r\ntwo,  three. "), ["One", "two,", "three."]);
assert.deepEqual(splitAtOrp("that"), { token: "that", before: "t", focus: "h", after: "at" });
assert.deepEqual(splitAtOrp("\u201crecognition\u201d"), { token: "\u201crecognition\u201d", before: "\u201cre", focus: "c", after: "ognition\u201d" });
```

- [ ] **Step 3: Run the focused tests and confirm missing-module failures.**

```bash
node --import tsx --test test/core/tokenize.test.ts test/core/orp.test.ts
```

Expected: FAIL because the core modules do not exist.

- [ ] **Step 4: Implement deterministic tokenization and ORP splitting.**

```ts
export const tokenize = (text: string): readonly string[] => {
  const normalized = text.replace(/\r\n?/gu, "\n").trim();
  return normalized.length === 0 ? [] : normalized.split(/\s+/u);
};

export interface OrpSplit { readonly token: string; readonly before: string; readonly focus: string; readonly after: string; }
export const splitAtOrp = (token: string): OrpSplit => {
  const points = Array.from(token);
  const lexical = points.flatMap((point, index) => /[\p{L}\p{N}]/u.test(point) ? [{ point, index }] : []);
  if (lexical.length === 0) return { token, before: "", focus: points[0] ?? "", after: points.slice(1).join("") };
  const offset = lexical.length === 1 ? 0 : lexical.length <= 5 ? 1 : lexical.length <= 9 ? 2 : lexical.length <= 13 ? 3 : 4;
  const pivot = lexical[Math.min(offset, lexical.length - 1)]!.index;
  return { token, before: points.slice(0, pivot).join(""), focus: points[pivot]!, after: points.slice(pivot + 1).join("") };
};
```

- [ ] **Step 5: Write failing aggregate transition tests.**

```ts
const ready = ReadingSession.empty().setText({ name: "sample", text: "one two" });
assert.deepEqual(ready.snapshot(), { phase: "ready", documentName: "sample", index: 0, total: 2, wpm: 300 });
assert.equal(ready.play().advance().snapshot().index, 1);
assert.equal(ready.play().pause().snapshot().phase, "paused");
assert.equal(ready.play().advance().stop().snapshot().index, 0);
assert.equal(ready.setSpeed(600).periodMs(), 100);
assert.throws(() => ready.setSpeed(0), /WPM/);
```

- [ ] **Step 6: Implement the immutable aggregate and use cases.**

Define `ReadingSession` with phases `empty | ready | playing | paused | complete`, WPM range 60–1200, immutable tokens, pure transition methods, `periodMs(): number`, and `frame(): DisplayFrame | undefined`. Each generated use case must authorize, read through `ReadingSessionRepository`, apply exactly one transition, publish `state` or `clear` as appropriate, save, emit redacted evidence, and call `finish`.

- [ ] **Step 7: Run focused proof and fast governance.**

```bash
node --import tsx --test test/core/*.test.ts
npm run check:fast
```

Expected: all core tests and governed checks pass.

- [ ] **Step 8: Commit the domain slice.**

```bash
git add domains src/core src/frontends/web/rta test/core
git commit -m "feat: model constant-cadence reading sessions"
```

### Task 3: Build the server-authoritative scheduler and versioned WebSocket host

**Files:**
- Generate/Create: `src/core/ports/reading-session-repository.ts`, `display-publisher.ts`, `cadence-scheduler.ts`
- Generate/Create: `src/adapters/memory-reading-session.ts`, `node-cadence-scheduler.ts`, `ws-display-publisher.ts`
- Create: `src/server/protocol.ts`, `src/server/create-server.ts`, `src/entrypoints/server.ts`
- Create/Modify: `runtimes/server.yaml`
- Test: `test/adapters/node-cadence-scheduler.test.ts`, `test/server/protocol.test.ts`, `test/integration/server-websocket.test.ts`

**Interfaces:**
- Produces: `CadenceScheduler.schedule({ periodMs, onTick, onStop }): CadenceHandle`; `DisplayPublisher.publish(event)`; `createReaderServer({ host, port, runtime, staticRoot, clock })`; protocol request/response/display unions.
- Consumes: `ReadingSessionRepository`, registered domain operations, `WebSocketServer`, monotonic `performance.now`, and the generated RTA server profile.

- [ ] **Step 1: Generate formal ports, adapters, server profile, and entrypoint descriptors.**

```bash
node --import tsx /Users/virgil/Developer/rta-next/scripts/rta.ts app add rta-rsvp-reader port "Reading Session Repository" --repo-root .. --domain main
node --import tsx /Users/virgil/Developer/rta-next/scripts/rta.ts app add rta-rsvp-reader port "Display Publisher" --repo-root .. --domain main
node --import tsx /Users/virgil/Developer/rta-next/scripts/rta.ts app add rta-rsvp-reader port "Cadence Scheduler" --repo-root .. --domain main
node --import tsx /Users/virgil/Developer/rta-next/scripts/rta.ts app add rta-rsvp-reader adapter "Memory Reading Session" --repo-root .. --domain main --port reading-session-repository
node --import tsx /Users/virgil/Developer/rta-next/scripts/rta.ts app add rta-rsvp-reader adapter "WebSocket Display Publisher" --repo-root .. --domain main --port display-publisher
node --import tsx /Users/virgil/Developer/rta-next/scripts/rta.ts app add rta-rsvp-reader adapter "Node Cadence Scheduler" --repo-root .. --domain main --port cadence-scheduler
node --import tsx /Users/virgil/Developer/rta-next/scripts/rta.ts app add rta-rsvp-reader profile Server --repo-root .. --domain main
node --import tsx /Users/virgil/Developer/rta-next/scripts/rta.ts app add rta-rsvp-reader entrypoint Server --repo-root .. --domain main --profile server --dispatches status
```

- [ ] **Step 2: Write a failing no-drift/no-punctuation scheduler test.**

```ts
const host = createFakeTimerHost(1_000);
const observed: number[] = [];
const handle = scheduler(host).schedule({ periodMs: 100, onTick: () => observed.push(host.now()), onStop: () => undefined });
host.advanceTo(1_350);
assert.deepEqual(observed, [1_100, 1_200, 1_300]);
assert.deepEqual(host.scheduledDeadlines(), [1_100, 1_200, 1_300, 1_400]);
handle.cancel();
```

The scheduler input deliberately contains no token or punctuation field.

- [ ] **Step 3: Implement a deadline-derived cadence adapter.**

```ts
const deadlineFor = (epoch: number, tick: number, periodMs: number): number => epoch + tick * periodMs;
// After each callback, schedule max(0, deadlineFor(epoch, nextTick, periodMs) - now()).
// Never derive the next deadline from the callback completion time.
```

- [ ] **Step 4: Write failing protocol codec tests.**

```ts
assert.deepEqual(decodeControl('{"protocol":"rsvp-control/v1","requestId":"1","type":"play"}').type, "play");
assert.throws(() => decodeControl('{"type":"play"}'), /protocol/);
assert.throws(() => decodeControl("{"), /JSON/);
assert.throws(() => decodeControl(JSON.stringify({ protocol: "rsvp-control/v1", requestId: "1", type: "set-speed", wpm: 0 })), /WPM/);
```

- [ ] **Step 5: Implement the closed protocol unions and codecs.**

Use discriminated TypeScript unions with stable versions, a 1 MiB text ceiling, request ID validation, WPM 60–1200, and stable error codes `invalid-json`, `invalid-request`, `unsupported-protocol`, `invalid-state`, `connection-failed`, and `internal-error`. Never include document text in responses or logs.

- [ ] **Step 6: Write a failing real WebSocket integration test.**

The test starts on port `0`, connects one `/display` socket and one `/control` socket, sends `set-text`, `set-speed` 600, and `play`, then asserts frames `one`, `two`, `three` arrive in order at approximately 100 ms intervals. It separately proves `one, two.` has the same intervals. Pause must produce no frames; stop must broadcast `clear`; a new display connection must receive the current state.

- [ ] **Step 7: Implement server composition and safe shutdown.**

`createReaderServer` serves `dist/web`, rejects non-loopback configuration in v1, validates upgrade paths, dispatches control requests through the RTA runtime, tracks display sockets in the publisher adapter, and closes timers/sockets/HTTP in order. `src/entrypoints/server.ts` handles `SIGINT` and `SIGTERM`, writes no session snapshot, and prints only the listening URL and actionable failures.

- [ ] **Step 8: Run focused and governance proof.**

```bash
node --import tsx --test test/adapters/node-cadence-scheduler.test.ts test/server/protocol.test.ts test/integration/server-websocket.test.ts
npm run check:fast
```

- [ ] **Step 9: Commit the server slice.**

```bash
git add domains runtimes src/core/ports src/adapters src/server src/entrypoints/server.ts test
git commit -m "feat: stream server-authoritative RSVP frames"
```

### Task 4: Implement the passive low-resolution display

**Files:**
- Create: `src/frontends/web/display-client.ts`, `src/frontends/web/app/ReaderDisplay.tsx`, `src/frontends/web/app/reader.css`
- Modify: `src/frontends/web/app/main.tsx`, `src/frontends/web/runtime/browser-runtime.ts`, `vite.config.ts`
- Test: `test/frontend/display-client.test.ts`, `test/frontend/reader-display.test.tsx`, `test/e2e/reader.spec.ts`, `playwright.config.ts`

**Interfaces:**
- Consumes: `rsvp-display/v1` events and the generated RTA web operation contract.
- Produces: a passive `ReaderDisplay` receiving `{ frame?: DisplayFrame }`; a reconnecting `createDisplayClient(url, sink)` with no command methods.

- [ ] **Step 1: Write failing display-client tests.**

Prove the client connects only to `/display`, accepts `state`, `frame`, and `clear`, clears on disconnect, retries with bounded 250–2000 ms backoff, and exposes no `send`, `play`, `pause`, or speed API.

- [ ] **Step 2: Implement the passive client behind the browser kernel boundary.**

The adapter owns `WebSocket`, retry timing, decoding, and cleanup. `main.tsx` only creates the kernel/client and renders current frame state. No component directly constructs a socket, reads storage, reads time, or sends commands.

- [ ] **Step 3: Write the failing visual component assertions.**

```ts
assert.equal(screen.queryAllByRole("button").length, 0);
assert.equal(screen.queryByRole("slider"), null);
assert.equal(screen.getByTestId("orp").textContent, "h");
assert.equal(screen.getByTestId("before").textContent, "t");
assert.equal(screen.getByTestId("after").textContent, "at");
```

- [ ] **Step 4: Implement the target display.**

Use three columns `minmax(0,1fr) auto minmax(0,1fr)`: before text right-aligned, one red focus glyph, after text left-aligned. Place the focus glyph at `50vw/50vh`; draw two low-contrast horizontal rails and short vertical ticks with pseudo-elements. Use a bundled system serif stack, warm white `#f4f0e8`, focus red `#e53935`, pure black background, `font-size: clamp(36px, 12vmin, 112px)`, `100dvw/100dvh`, hidden overflow, and no animation between tokens.

- [ ] **Step 5: Add low-resolution Playwright scenarios.**

At 640×360 and 854×480, assert no overflow, fixed ORP bounding-box center across `a`, `that`, `recognition`, and a 30-character token, black empty/clear state, no focusable elements, and no visible text other than the current token.

- [ ] **Step 6: Run frontend proof and a production build.**

```bash
node --import tsx --test test/frontend/*.test.ts test/core/orp.test.ts
npx playwright test test/e2e/reader.spec.ts
npm run build:web
npm run check:fast
```

- [ ] **Step 7: Commit the display slice.**

```bash
git add src/frontends test/frontend test/e2e playwright.config.ts vite.config.ts
git commit -m "feat: render passive AR RSVP display"
```

### Task 5: Add the RTA-backed CLI and safe server lifecycle

**Files:**
- Generate/Create: `src/core/ports/control-client.ts`, `text-source.ts`, `process-supervisor.ts`
- Generate/Create: `src/adapters/ws-control-client.ts`, `node-text-source.ts`, `node-process-supervisor.ts`
- Create: `src/cli/parse.ts`, `src/cli/render.ts`, `src/entrypoints/cli.ts`
- Create/Modify: `runtimes/cli.yaml`, `package.json`
- Test: `test/cli/parse.test.ts`, `test/cli/run.test.ts`, `test/adapters/node-text-source.test.ts`, `test/adapters/node-process-supervisor.test.ts`, `test/integration/cli-server.test.ts`

**Interfaces:**
- Produces: `run(argv, io): Promise<number>`; `ControlClient.request(ControlRequest)`; `TextSource.readUtf8(path)`; `ProcessSupervisor.start/status/requestShutdown`.
- Consumes: registered RTA CLI operations, the control protocol, `runtime/server.pid`, `runtime/server.log`, and compiled server entrypoint.

- [ ] **Step 1: Generate CLI ports/adapters/profile/entrypoint.**

```bash
node --import tsx /Users/virgil/Developer/rta-next/scripts/rta.ts app add rta-rsvp-reader port "Control Client" --repo-root .. --domain main
node --import tsx /Users/virgil/Developer/rta-next/scripts/rta.ts app add rta-rsvp-reader port "Text Source" --repo-root .. --domain main
node --import tsx /Users/virgil/Developer/rta-next/scripts/rta.ts app add rta-rsvp-reader port "Process Supervisor" --repo-root .. --domain main
node --import tsx /Users/virgil/Developer/rta-next/scripts/rta.ts app add rta-rsvp-reader adapter "WebSocket Control Client" --repo-root .. --domain main --port control-client
node --import tsx /Users/virgil/Developer/rta-next/scripts/rta.ts app add rta-rsvp-reader adapter "Node Text Source" --repo-root .. --domain main --port text-source
node --import tsx /Users/virgil/Developer/rta-next/scripts/rta.ts app add rta-rsvp-reader adapter "Node Process Supervisor" --repo-root .. --domain main --port process-supervisor
node --import tsx /Users/virgil/Developer/rta-next/scripts/rta.ts app add rta-rsvp-reader profile CLI --repo-root .. --domain main
node --import tsx /Users/virgil/Developer/rta-next/scripts/rta.ts app add rta-rsvp-reader entrypoint CLI --repo-root .. --domain main --profile cli --dispatches status
```

- [ ] **Step 2: Write the CLI parser table test.**

```ts
assert.deepEqual(parse(["play"]), { kind: "play" });
assert.deepEqual(parse(["text", "set", "samples/meditation.txt"]), { kind: "set-text", path: "samples/meditation.txt" });
assert.deepEqual(parse(["speed", "set", "600"]), { kind: "set-speed", wpm: 600 });
assert.deepEqual(parse(["server", "start", "--port", "4173"]), { kind: "server-start", port: 4173, foreground: false });
assert.throws(() => parse(["speed", "set", "fast"]), /usage/);
```

- [ ] **Step 3: Implement parsing and stable renderers.**

The parser is exhaustive over the documented grammar. The renderer accepts domain results and produces either concise human lines or exactly one JSON object. It never performs I/O and never prints supplied text.

- [ ] **Step 4: Write failing adapter safety tests.**

Text source rejects missing, non-file, non-UTF-8, empty, and >1 MiB content with stable errors. Process supervisor writes PID only after the child reports ready, recognizes a stale PID without signaling it, verifies command identity before shutdown fallback, and rotates/truncates only its own ignored log. WebSocket control client enforces one response per request ID and times out cleanly.

- [ ] **Step 5: Implement narrow formal adapters.**

Use `fs`, `child_process`, environment, and WebSocket only inside their respective adapter files. The process adapter spawns `process.execPath` with the resolved compiled server path and `detached: true`; the server announces readiness through an IPC message before PID publication. Normal shutdown is the protocol `shutdown` request.

- [ ] **Step 6: Implement the thin RTA CLI entrypoint.**

`run` parses once, maps the parsed shape to a registered message, dispatches through the CLI profile runtime with actor/evidence context, renders once, and maps typed failure to exit 1 or usage to exit 2. The `if (isMainModule())` block is the only place that assigns `process.exitCode`.

- [ ] **Step 7: Prove the complete command story against a real server.**

```bash
npm run build
node --import tsx --test test/cli/*.test.ts test/adapters/*.test.ts test/integration/cli-server.test.ts
node dist/entrypoints/cli.js server start
node dist/entrypoints/cli.js text set samples/meditation.txt
node dist/entrypoints/cli.js speed set 360
node dist/entrypoints/cli.js play
node dist/entrypoints/cli.js status --json
node dist/entrypoints/cli.js pause
node dist/entrypoints/cli.js stop
node dist/entrypoints/cli.js server stop
npm run check:fast
```

Expected: every command succeeds, JSON status is machine-readable, and the final lifecycle status is stopped.

- [ ] **Step 8: Commit the CLI slice.**

```bash
git add domains runtimes src/core/ports src/adapters src/cli src/entrypoints/cli.ts package.json test
git commit -m "feat: control reader and server from RTA CLI"
```

### Task 6: Samples, release proof, visual review, and GitHub delivery

**Files:**
- Create: `samples/meditation.txt`, `samples/technology.txt`, `samples/punctuation.txt`, `README.md`
- Modify: `.github/workflows/ci.yml`
- Generated: `src/frontends/web/rta/generated-contract.ts`, `package-lock.json`

**Interfaces:**
- Consumes: all preceding runtime and CLI interfaces.
- Produces: reproducible onboarding, three deterministic fixtures, release-clean RTA proof, and `github.com/SiderealMollusk/rta-rsvp-reader`.

- [ ] **Step 1: Add short public-domain/original sample passages.**

`punctuation.txt` must contain commas, periods, quotes, em dashes, short tokens, and long tokens so it doubles as a manual cadence/ORP check. Samples are fixture content, not runtime persistence.

- [ ] **Step 2: Write the README as an executable happy path.**

Document prerequisites, registry configuration, install/build, `rsvp server start`, opening the localhost URL, text/speed/play/pause/stop commands, lifecycle shutdown, full protocol table, architecture boundaries, troubleshooting, and the explicit limits: loopback-only, one shared session, no controls, no persistence, no punctuation dwell.

- [ ] **Step 3: Update CI to run the standalone release slice.**

```yaml
- run: npm ci
- run: npm run typecheck
- run: npm test
- run: npm run build
- run: npx playwright install --with-deps chromium
- run: npx playwright test
```

- [ ] **Step 4: Perform code review before expensive proof.**

Inspect `git diff --check`, untracked files, descriptor/source agreement, evidence redaction, effect boundaries, server shutdown ordering, constant-period scheduler tests, lack of frontend controls, and absence of absolute paths or local RTA links. Correct findings and rerun only affected tests plus `npm run check:fast`.

- [ ] **Step 5: Run the final local release gate once.**

```bash
node --import tsx /Users/virgil/Developer/rta-next/scripts/rta.ts app sync . frontend web
node --import tsx /Users/virgil/Developer/rta-next/scripts/rta.ts app sync . frontend web --check
node --import tsx /Users/virgil/Developer/rta-next/scripts/rta.ts app doctor rta-rsvp-reader --repo-root .. --release
npm run build
npm test
npx playwright test
npm pack --dry-run
git diff --check
```

Expected: every command passes; package contents exclude `runtime/`, logs, screenshots, and local configuration.

- [ ] **Step 6: Visually inspect the live experience.**

Start the built server, load `samples/punctuation.txt`, set 300 and then 900 WPM, and inspect at 640×360 and 854×480. Confirm fixed red glyph position, rails/ticks, full-black empty state, legible warm-white serif text, stable constant cadence through punctuation, no UI, no scrollbars, and clean reconnect behavior. Stop the server afterward.

- [ ] **Step 7: Commit the review-clean release candidate.**

```bash
git add .
git commit -m "docs: complete RSVP reader release"
git status --short
```

Expected: clean worktree.

- [ ] **Step 8: Create the private GitHub repository and push the proven commit.**

```bash
gh repo create SiderealMollusk/rta-rsvp-reader --private --source=. --remote=origin --push
gh repo view SiderealMollusk/rta-rsvp-reader --json nameWithOwner,visibility,url,defaultBranchRef
gh run watch --exit-status
```

Expected: repository exists on `main`, visibility is `PRIVATE`, and GitHub Actions passes.

## Plan self-review

- Spec coverage: every accepted behavior maps to a task and explicit proof.
- Placeholder scan: no deferred implementation placeholders are present; deliberately deferred product scope is explicit in the design.
- Type consistency: `ReadingSnapshot`, `DisplayFrame`, protocol unions, port methods, server factory, display client, and CLI `run` have one definition and matching consumers.
- Scope: one application, one server, one session, one passive display protocol, and one CLI form a cohesive releasable system; deferred features do not leak into the plan.
