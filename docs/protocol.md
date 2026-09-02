# WebSocket protocol

The server listens at `/ws` and requires a role query parameter.

- `/ws?role=display` is receive-only and gets `state`, `frame`, and `clear` events.
- `/ws?role=control` accepts CLI commands and returns a matching `ack` or `error`.

All messages are UTF-8 JSON. Each command has a caller-generated `requestId`.

```json
{"type":"command","requestId":"1","command":"set-text","name":"demo.txt","text":"One word at a time."}
{"type":"command","requestId":"2","command":"set-speed","wpm":600}
{"type":"command","requestId":"3","command":"play"}
```

The other commands are `pause`, `stop`, and `status`. A successful control response includes the authoritative state:

```json
{"type":"ack","requestId":"3","command":"play","state":{"phase":"playing","documentName":"demo.txt","index":0,"total":5,"wpm":600}}
```

A display frame contains both the original token and its pre-split spans:

```json
{"type":"frame","frame":{"index":0,"total":5,"token":"One","before":"O","focus":"n","after":"e"},"periodMs":100}
```

The browser performs no tokenization, timing, or ORP calculation. It renders the latest frame exactly as supplied by the server.
