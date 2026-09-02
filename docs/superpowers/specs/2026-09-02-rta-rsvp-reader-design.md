# RTA RSVP Reader Design

## Objective

Build a standalone GitHub repository named `rta-rsvp-reader` that recreates the Neurobuff RSVP speed-reading experience for low-resolution AR glasses. The browser surface has no controls. A thin `rsvp` CLI owns server lifecycle and sends all reading controls over WebSockets.

## Fixed product decisions

- One token is shown at a time on a black field.
- One red optimal-recognition-point character remains at a fixed screen coordinate.
- Thin horizontal rails and short vertical registration ticks identify the fixation point.
- Cadence is constant at the selected WPM. Commas, periods, paragraph breaks, and other punctuation never add delay.
- The server is the authoritative clock and reading-session owner.
- The browser is a passive display with no buttons, menus, gestures, keyboard controls, progress UI, WPM label, or comprehension questions.
- The first release serves only on `127.0.0.1` and stores no reading-session state across restarts.
- Files on disk are the content boundary. Sample `.txt` files ship in `samples/`; `rsvp text set <file>` reads a file and transmits its contents to the server.
- `@siderealmollusk/rta` is consumed at the exact version and registry source selected by the generated lockfile. No local links or nearby checkout imports are allowed.

## User experience

Opening `http://127.0.0.1:4317/` produces a completely black screen while the reader is stopped or has no content. Once content is loaded and played, a single large serif token appears in a subdued horizontal target band. The chosen character is red; all other characters are warm white. Word length changes around the fixed red character rather than moving the fixation point.

The layout is safe for a small, low-resolution rectangular display: no element depends on hover, fine pointer input, or small text. The word size uses viewport-relative limits, and long tokens shrink enough to remain within the viewport.

## CLI contract

The executable is `rsvp`.

```text
rsvp server start [--port 4317]
rsvp server foreground [--port 4317]
rsvp server stop
rsvp server status [--json]
rsvp text set <path>
rsvp speed set <wpm>
rsvp play
rsvp pause
rsvp stop
rsvp status [--json]
```

`server start` launches a detached local process and writes operational PID and log files under ignored `runtime/`. `server stop` requests graceful shutdown over the control socket and uses the PID only to report stale runtime state, never to kill an unverified process. Reading `stop` is distinct: it resets the cursor to the first token but leaves the server running.

Human output is concise. `--json` produces one JSON object suitable for automation. Invalid commands return exit 2; connection or domain failures return exit 1.

## WebSocket protocol

One HTTP server serves the built frontend and upgrades two paths:

- `/display`: passive browser connections; server-to-client events only after an initial snapshot.
- `/control`: CLI request/response commands.

Every control request contains `protocol: "rsvp-control/v1"`, a unique `requestId`, and one of `set-text`, `set-speed`, `play`, `pause`, `stop`, `status`, or `shutdown`. Every response echoes `requestId` and is either `{ ok: true, state }` or `{ ok: false, error: { code, message } }`.

Display messages use `protocol: "rsvp-display/v1"` and are either:

- `state`: complete public session state for connection, command, pause, stop, and completion transitions.
- `frame`: `{ index, total, token, before, focus, after, issuedAt }` for one rendered token.
- `clear`: remove the token immediately on reading stop, content replacement, or session completion.

Unknown versions, malformed JSON, oversized payloads, invalid WPM, missing text, and commands issued in an invalid state return stable errors without crashing the server.

## Domain model and cadence

`ReadingSession` is the aggregate. It owns the document name, immutable token list, current zero-based index, WPM, and phase (`empty`, `ready`, `playing`, `paused`, `complete`). Pure transitions implement set text, set speed, play, pause, stop, advance, and snapshot.

Tokenization is deterministic: normalize CRLF to LF, trim the document, and split on Unicode whitespace while retaining punctuation attached to tokens. Empty input is rejected.

The optimal recognition point is selected over Unicode code points. Leading non-letter/digit punctuation is ignored when measuring the lexical portion. The lexical character index is 0 for a one-character word, 1 for 2–5 characters, 2 for 6–9, 3 for 10–13, and 4 for 14 or more, clamped to the available lexical characters. Opening punctuation stays in `before`; trailing punctuation stays in `after`.

The period is exactly `60_000 / wpm` milliseconds. A monotonic, deadline-based scheduler derives every deadline from the play epoch rather than chaining accumulated delays. Punctuation is not inspected by the scheduler. Pausing cancels the next deadline without changing the cursor. Resuming begins a new epoch from the current cursor. Completion clears the display and transitions to `complete`.

## RTA boundaries

The RTA application is generated as kind `web`, then extended through `rta app add` rather than hand-building descriptors or runtime wiring.

- Core commands and use cases own validation, state transitions, sequencing, and `finish`.
- `ReadingSessionRepository`, `DisplayPublisher`, `CadenceScheduler`, `ControlClient`, `TextSource`, and `ProcessSupervisor` are declared ports.
- Memory session storage, Node monotonic scheduling, WebSocket display publication/client transport, filesystem text reads, and process supervision are formal adapters.
- The web frontend consumes the generated browser contract and a renderer-independent display client; React only renders the supplied frame.
- The CLI parses arguments, dispatches registered messages through its named runtime profile, renders results, and selects exit status. It contains no filesystem, socket, process, timing, or reading policy.
- Evidence is emitted for commands and lifecycle transitions without recording the supplied document text.

## Operational files and source files

Tracked source includes sample texts, configuration, tests, and documentation. Ignored `runtime/` may contain `server.pid` and `server.log`; it is not session persistence. On startup the server always begins with an empty reading session.

## Verification and delivery

Tests cover pure domain transitions, ORP splitting, exact constant scheduler deadlines, adapter conformance, protocol validation, CLI parsing, real WebSocket control/display behavior, reconnect snapshots, lifecycle safety, frontend rendering at low resolutions, and a browser-level end-to-end sample passage.

Release proof includes focused tests during development, `npm run check:fast` equivalents in the standalone repository, `rta app sync . frontend web --check`, `rta app doctor . --release`, typecheck, unit/integration tests, production build, visual browser inspection, and a clean GitHub Actions run. The final repository is created under `SiderealMollusk` as private by default and pushed only after local release proof passes.

## Deferred deliberately

LAN binding, authentication, TLS, multiple independent sessions, EPUB/PDF parsing, browser controls, on-glass status UI, speed ramps, punctuation dwell, persistence, telemetry backends, and comprehension testing are outside version one.
