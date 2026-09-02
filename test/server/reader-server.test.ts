import assert from "node:assert/strict";
import { describe, it } from "node:test";
import WebSocket from "ws";
import { createReaderServer } from "../../src/server/reader-server.js";
import type { ServerMessage } from "../../src/server/protocol.js";

const open = (url: string): Promise<WebSocket> => new Promise((resolve, reject) => {
  const socket = new WebSocket(url);
  socket.once("open", () => resolve(socket));
  socket.once("error", reject);
});

const next = (socket: WebSocket, predicate: (message: ServerMessage) => boolean): Promise<ServerMessage> =>
  new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("timed out waiting for WebSocket message")), 2_000);
    const receive = (data: WebSocket.RawData) => {
      const message = JSON.parse(data.toString()) as ServerMessage;
      if (!predicate(message)) return;
      clearTimeout(timeout);
      socket.off("message", receive);
      resolve(message);
    };
    socket.on("message", receive);
  });

describe("reader WebSocket server", () => {
  it("accepts control commands and broadcasts display frames", async () => {
    const server = createReaderServer();
    const address = await server.listen(0);
    const display = await open(`ws://127.0.0.1:${address.port}/ws?role=display`);
    const control = await open(`ws://127.0.0.1:${address.port}/ws?role=control`);
    try {
      const loaded = next(control, (message) => message.type === "ack" && message.requestId === "load");
      control.send(JSON.stringify({ type: "command", requestId: "load", command: "set-text", name: "sample", text: "reading cadence" }));
      assert.equal((await loaded).type, "ack");

      const frame = next(display, (message) => message.type === "frame");
      const playing = next(control, (message) => message.type === "ack" && message.requestId === "play");
      control.send(JSON.stringify({ type: "command", requestId: "play", command: "play" }));
      const observed = await frame;
      assert.equal(observed.type, "frame");
      if (observed.type === "frame") {
        assert.equal(observed.frame.token, "reading");
        assert.equal(observed.frame.focus, "a");
        assert.equal(observed.periodMs, 200);
      }
      assert.equal((await playing).type, "ack");
    } finally {
      display.close();
      control.close();
      await server.close();
    }
  });

  it("returns protocol errors without crashing the host", async () => {
    const server = createReaderServer();
    const address = await server.listen(0);
    const control = await open(`ws://127.0.0.1:${address.port}/ws?role=control`);
    try {
      const response = next(control, (message) => message.type === "error");
      control.send("invalid");
      assert.equal((await response).type, "error");
    } finally {
      control.close();
      await server.close();
    }
  });
});
