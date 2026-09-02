# Companion voice utterance corpus

On macOS, render a local AIFF sample per fixture with:

```sh
mkdir -p /tmp/rsvp-voice-samples
while IFS= read -r fixture; do
  id=$(printf '%s' "$fixture" | jq -r '.id')
  utterance=$(printf '%s' "$fixture" | jq -r '.utterance')
  say -o "/tmp/rsvp-voice-samples/$id.aiff" "$utterance"
done < samples/voice/companion-utterances.jsonl
```

Those generated audio files are deliberately ignored by Git; use them as repeatable TTS input for ASR evaluation.

`companion-utterances.jsonl` is the v1 acceptance corpus for the future paired-app voice surface. It permits exactly four no-argument calls: `rsvp.companion.play`, `rsvp.companion.pause`, `rsvp.companion.next`, and `rsvp.companion.back`.

Each accepted record labels the expected chunk position and reader effects. Every `null` record must result in no tool call and no reader effect. A future VTT/model harness scores an exact function name and an empty arguments object; it must not turn speed, content loading, chunking, or server-lifecycle requests into companion actions.
