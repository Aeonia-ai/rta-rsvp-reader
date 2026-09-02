# Voice utterance corpus

`utterances.jsonl` is the Level 2 gold corpus for a future speech-to-text plus local tool-calling model. Every line has an `id`, a speakable `utterance`, and either an expected OpenAI-style function call or `null` with a reason why no tool should run.

The corpus is text-first on purpose: it can be synthesized with different voices, microphones, and speaking rates without changing the expected action. Do not execute a tool call unless its name and arguments exactly match the allowed contract.

On macOS, render a local AIFF sample per fixture with:

```sh
mkdir -p /tmp/rsvp-voice-samples
while IFS= read -r fixture; do
  id=$(printf '%s' "$fixture" | jq -r '.id')
  utterance=$(printf '%s' "$fixture" | jq -r '.utterance')
  say -o "/tmp/rsvp-voice-samples/$id.aiff" "$utterance"
done < samples/voice/utterances.jsonl
```

Those generated audio files are deliberately ignored by Git; use them as repeatable TTS input for ASR evaluation.
