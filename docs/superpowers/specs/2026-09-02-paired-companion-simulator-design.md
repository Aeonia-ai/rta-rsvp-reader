# Paired Companion Simulator Design

## Goal

Create a local, deterministic simulator for the control core of a future paired mobile companion. It proves that compact hands-free commands can safely navigate prepared reading chunks and operate the existing RSVP reader without building a mobile app, voice capture, speech-to-text, or a local language-model runtime.

## Context

The future product has two distinct surfaces:

- A passive display reader on the glasses.
- A paired mobile companion that owns reading setup: content loading, chunk construction, chunk position, and speed.

Voice is a small, hands-free control surface for the companion. It must not be able to select arbitrary files, alter chunk construction, or issue server-lifecycle commands. Speech-to-text is an independent upstream concern: this design begins with transcript strings and can later be fed from any VTT/ASR provider.

## Scope

The simulator provides:

1. An in-memory ordered sequence of prepared chunks and a current chunk index.
2. A narrow tool boundary with exactly four no-argument calls: `rsvp.companion.play`, `rsvp.companion.pause`, `rsvp.companion.next`, and `rsvp.companion.back`.
3. A transport port that sends existing reader actions to the current RSVP operator/WebSocket implementation.
4. A transcript-test adapter that accepts a supplied tool call (and later a model result), validates it, and exercises the same companion state machine.
5. A fixture corpus for the four intents plus explicit no-call inputs.

The simulator does not provide a mobile UI, on-device VTT, microphone permissions, Bluetooth, hosted deployment, persistence, arbitrary file loading, WPM changes, model inference, or a browser control UI.

## Command Contract

All four tools take an empty `arguments` object. Any unknown tool, any argument, malformed object, or rejected/no-call result is ignored at the companion boundary and must make no reader change.

| Tool | Companion effect | Reader effect |
| --- | --- | --- |
| `rsvp.companion.play` | Keep the current chunk/index. | Send `play`. |
| `rsvp.companion.pause` | Keep the current chunk/index. | Send `pause`. |
| `rsvp.companion.next` | Move one chunk forward if one exists. | Send `set-text` for that chunk, then `stop`, leaving word zero visible. |
| `rsvp.companion.back` | Move one chunk backward if one exists. | Send `set-text` for that chunk, then `stop`, leaving word zero visible. |

At the first chunk, `back` is a safe no-op. At the last chunk, `next` is a safe no-op. No command wraps around. `play` and `pause` are intentionally idempotent at the companion boundary; any duplicate delivery simply reaches the existing reader command.

## Architecture

```text
prepared chunks + current index
            │
            ▼
  CompanionController (pure use-case)
            │ validates four tools and chooses effects
            ▼
   CompanionReaderPort (narrow port)
            │
            ▼
existing OperatorAction / RTA operator / localhost WebSocket
            │
            ▼
 passive RSVP display
```

The controller contains the navigation policy. It depends only on chunk state and the narrow port, so it can be tested without a server. An adapter maps its effects into the existing `set-text`, `play`, `pause`, and `stop` actions. This preserves the current reader and RTA application path rather than creating a second control protocol.

The existing broad `rsvp voice call` contract stays intact as a Level 1 plumbing seam. The simulator adds a deliberately separate paired-companion contract; it does not widen the existing voice command surface.

## Input Boundary

The initial executable input is structured tool-call JSON, not raw language. This permits deterministic end-to-end tests now:

```json
{"name":"rsvp.companion.next","arguments":{}}
```

A later model adapter may consume a transcript and produce this same JSON. It may execute a call only when it returns one of the four exact names with an empty arguments object. The controller will be unaware whether the call originated from a test fixture, Needle, another model, or a future mobile implementation.

## Chunk Model

A prepared chunk is an immutable non-empty text string with a stable zero-based position in an ordered session. The companion simulator receives the complete array at construction. Chunking belongs to the future paired app setup flow, so this feature accepts chunks rather than deciding how to create them.

Selecting a neighboring chunk always replaces the reader text and stops it. This avoids accidental reading continuation across a chunk boundary and gives the wearer a stable first word after a navigation command.

## Error Handling and Safety

- Invalid calls produce a typed rejection result and do not invoke the reader port.
- Boundary navigation produces an acknowledged no-op; it does not send `set-text` or `stop`.
- A reader-port failure leaves the simulator's current index unchanged. The navigation index is committed only after its `set-text` and `stop` effects succeed.
- The companion never receives raw paths or unrestricted `OperatorAction` values from the voice boundary.
- There is no persistence. Simulator chunks and index exist only in process memory.

## Test Strategy

### Unit: companion controller

Prove all four calls, first/last chunk no-ops, no-wrap behavior, and index rollback when a port action fails. Use an in-memory fake port that records effects.

### Contract: tool boundary

Prove only the exact four names with `{}` are accepted. Test malformed payloads, extra arguments, legacy RSVP tools, and unknown names as rejected no-ops.

### Integration: existing reader path

With a local test server, load two or more known chunks through the adapter and verify a `next`/`back` transition updates the display session text, selects word zero, and remains stopped. Verify `play` and `pause` use the existing operator path.

### Voice acceptance fixtures

Add a companion-focused JSONL corpus with direct forms, polite forms, disfluencies, and no-call phrases. Fixtures label only these four calls; the later model harness scores exact function name, empty arguments, expected state transition, and no reader effect for no-calls.

## Acceptance Criteria

- The simulator exposes exactly four companion tool definitions and rejects all other tool calls.
- A supplied valid call reaches the existing reader through a narrow adapter, not a parallel WebSocket protocol.
- `next` and `back` move one prepared chunk, reset to word zero, and leave playback stopped.
- Boundary navigation and rejected/no-call inputs do not contact the reader.
- All behavior is covered by deterministic tests; a safe live integration test proves the existing reader path.
- The project has no added model, VTT, mobile, persistence, or browser-control dependency.

## Deferred Follow-on

After the simulator is proven, a model adapter can be evaluated against the companion fixture corpus. VTT feeds it transcripts. A paired app can later supply chunks, own the real reading queue, and implement the same four-call contract while communicating with a hosted glasses Web App.
