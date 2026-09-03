# RTA RSVP Reader

A localhost-only [rapid serial visual presentation](https://en.wikipedia.org/wiki/Rapid_serial_visual_presentation) reader designed for low-resolution AR glasses. The browser is a passive black display with no buttons, menus, status text, or input fields. A CLI controls the server over WebSockets.

The visual treatment follows the speed-reading demonstration shared on [r/interestingasfuck](https://www.reddit.com/r/interestingasfuck/comments/1qc6slz/this_speed_reading_training_starts_at_300wpm_and/) and its [source video](https://www.youtube.com/watch?v=NdKcDPBQ-Lw): one word at a time, fixed target guides, and a red optimal-recognition-position character that remains at the optical center.

## Team setup and first reading session

For every Aeonia AI teammate: install Node.js 22 or newer, then run this once in a terminal.

```sh
git clone https://github.com/Aeonia-ai/rta-rsvp-reader.git
cd rta-rsvp-reader
npm install
npm run setup
rsvp server start
rsvp load samples/demo.txt
rsvp speed 600
rsvp play
```

Open [http://127.0.0.1:4317](http://127.0.0.1:4317) on the display before `rsvp play`.

`npm run setup` builds the app and installs `rsvp` into an active user PATH directory. Do not separately run `npm run build` or `npm link`.

For later sessions, start the server and use the same reading commands:

```sh
rsvp server start
rsvp load samples/demo.txt
rsvp speed 600
rsvp play
rsvp pause
rsvp stop
rsvp status
rsvp server stop
```

`rsvp stop` resets the cursor to the first word while retaining the loaded text and speed. `rsvp pause` freezes the current word. `rsvp server stop` terminates the host process.

## Paired companion simulator

The repository also contains an in-memory test simulator for the future paired mobile companion. Its intentionally tiny voice-facing boundary is:

```text
transcript/model result → rsvp.companion.play | rsvp.companion.pause
                        | rsvp.companion.next | rsvp.companion.back
                      → companion controller → existing reader WebSocket
```

Each accepted call has an empty arguments object. `play` and `pause` control the selected chunk; `next` and `back` select one neighboring prepared chunk, reset it to word zero, and leave it stopped. At either end of the queue, navigation is a no-op. Invalid and no-call inputs never contact the reader.

The simulator is process-memory-only and test-focused. VTT, models, and mobile implementation are deferred. Its [companion voice acceptance corpus](samples/voice/companion-utterances.jsonl) supplies exact calls, expected chunk state, and no-call cases for the later integration.

After pulling project updates, rerun setup to rebuild and refresh the command:

```sh
git pull
npm run setup
```

## CLI

```text
rsvp server start [--port 4317]
rsvp server stop
rsvp server restart
rsvp server status
rsvp server foreground [--port 4317]
rsvp load <text-file>
rsvp speed <60-1200>
rsvp play | pause | stop | status
```

Add `--json` to any command for structured output. If the server was started on a custom port, its on-disk process record lets later commands discover that port. `RSVP_READER_URL` can explicitly select another localhost WebSocket URL; `RSVP_READER_ROOT` can select the installed project root.

## Cadence and display behavior

- Every token receives exactly `60,000 / WPM` milliseconds.
- Commas, periods, and other punctuation do **not** add dwell time.
- Text is whitespace-tokenized, preserving attached punctuation.
- The red character uses a length-based ORP heuristic over Unicode code points.
- The first word appears immediately when `play` is accepted.
- The display reconnects automatically and receives the current frame.
- Completion and `stop` clear the word while leaving the optical guides visible.

The display has no local controls by design. Keyboard, pointer, and touch events do not manage reading state.

## HTTPS glasses deployment

The production app has three routes on one HTTPS origin:

- `/` is a landing page with a QR code for `/glasses-app`.
- `/glasses-app` is the passive reader intended for Meta Ray-Ban Display.
- `/controls` is the single-user browser control panel for bundled samples, WPM, playback, and status.

Build and run the deployable container locally:

```sh
docker build -t rsvp-reader .
docker run --rm -p 4317:4317 rsvp-reader
```

Deploy that image to any host that gives it a public HTTPS URL and preserves WebSocket upgrades. Open `/` on a phone to scan the glasses QR, or add `https://your-reader-host/glasses-app` in the Meta AI app’s Developer Mode under App connections → Web apps. Use `/controls` from the paired phone or desktop. The deployment intentionally has one shared in-memory reader and no authentication; do not expose it as a multi-user public service.

## Google Cloud demo deployment

The repository can deploy the existing container to a one-instance Cloud Run demo through GitHub Actions. This is intentionally a short-lived public `run.app` URL: it has no user authentication, database, Firebase dependency, custom domain, or DNS record.

One Google Cloud operator with billing enabled and sufficient project permissions runs this once:

```sh
gcloud auth login
GCP_PROJECT_ID=rsvp-reader-personal-demo \
GCP_PROJECT_NUMBER=1016486021065 \
GCP_REGION=us-west1 \
./scripts/bootstrap-google-cloud.sh
```

The script enables the required APIs; creates the Artifact Registry repository, Cloud Run runtime identity, and GitHub deploy identity; and configures GitHub OIDC trust limited to the `Aeonia-ai/rta-rsvp-reader` `main` branch. It is safe to rerun because it describes each resource before attempting to create it. It never creates or prints a service-account key.

Add the four values printed by the script as repository **Actions variables** at `Settings` → `Secrets and variables` → `Actions` → `Variables`:

```text
GCP_PROJECT_ID
GCP_REGION
GCP_WIF_PROVIDER
GCP_DEPLOY_SERVICE_ACCOUNT
```

They are configuration values, not credentials—do not add a Google JSON key as a GitHub secret. A push to `main`, or manually dispatching the `deploy-cloud-run` workflow, verifies the app, pushes an immutable commit-SHA image, deploys it to Cloud Run, and puts the demo URL in the workflow summary.

## Architecture

The app uses the RTA paved-road layout and exact `@siderealmollusk/rta@0.6.0` runtime. Commands enter a typed RTA message, run through a use case, and reach effects only through declared ports/adapters.

```text
CLI → Operate command → OperatorActionsPort → local adapter → WebSocket
                                                        ↓
display ← frame broadcasts ← server scheduler ← reading use cases
                                      ↓
                         MemoryReadingSession adapter
```

Reading text and state live only in process memory. The only runtime files on disk are `runtime/rsvp-reader.json` (process metadata) and `runtime/rsvp-reader.log`; both are ignored by Git. Loaded text is wrapped as an RTA secret before crossing the repository adapter, preventing document content from appearing in evidence records.

See [docs/protocol.md](docs/protocol.md) for the WebSocket envelope and [the design spec](docs/superpowers/specs/2026-09-02-rta-rsvp-reader-design.md) for the complete rationale.

## Development

```sh
npm test
npm run typecheck
npm run build
```

The current RTA source CLI is used for local `app sync` and release `app doctor` checks because standalone app-root support postdates the published runtime package. The application itself depends only on the pinned published runtime.

## License

[MIT](LICENSE)
