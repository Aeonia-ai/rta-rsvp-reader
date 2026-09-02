# Voice Tool Plumbing Design

## Goal

Prove that a future local voice stack can control the RSVP reader without changing its reading or server behavior.

## Scope

Level 1 adds a strict, OpenAI-style function-call boundary to the existing CLI. A call is parsed, validated, mapped to the existing `OperatorAction` union, and dispatched through the current RTA application path. It introduces no speech recognizer, model runtime, persistence, or browser controls.

Level 2 is prepared by a versioned text-utterance corpus. Each utterance carries its expected function name and JSON arguments; a later ASR plus small-model harness can consume the same file and score an exact tool call.

## Contract

The Level 1 input is a JSON object with `name` and `arguments` fields. Supported names are:

- `rsvp.server.start`, `rsvp.server.stop`, `rsvp.server.restart`, `rsvp.server.status`
- `rsvp.load_text`, `rsvp.set_speed`
- `rsvp.play`, `rsvp.pause`, `rsvp.stop`, `rsvp.status`

The public CLI form is `rsvp voice call '<json>'`. The command only maps and invokes an existing action; lifecycle, file access, WebSocket communication, and evidence remain in their existing adapters.

## Safety and validation

Unknown functions, missing required fields, unexpected fields, non-integer speeds, out-of-range speeds, and invalid ports fail before an action is dispatched. A voice call cannot introduce an action unavailable through the normal CLI.

## Test strategy

Unit tests cover every function-to-action mapping and validation failure. A hand-off test injects an executor and proves calls enter the existing operator seam. A fixture test validates every Level 2 utterance label against the same mapper. A single live-safe integration test invokes `rsvp.server.status` through the voice entry point.

## Deferred Level 2 runtime

Speech recognition, TTS-generated audio files, ASR accuracy scoring, and local model selection are deferred. The corpus is intentionally text-first so the same commands can be rendered by multiple voices and evaluated by multiple ASR engines without changing expected tool behavior.
