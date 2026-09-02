import { createReadStream, existsSync } from "node:fs";
import { createServer, type IncomingMessage, type Server as HttpServer } from "node:http";
import { extname, join, normalize, resolve } from "node:path";
import { WebSocketServer, WebSocket, type RawData } from "ws";
import { resetMemoryReadingSession } from "../adapters/memory-reading-session.js";
import { createRuntime } from "../runtime/application.js";
import { DeadlineCadenceScheduler } from "./cadence-scheduler.js";
import { encodeServerMessage, parseControlMessage, type ServerMessage } from "./protocol.js";
import { ReadingController } from "./reading-controller.js";

export interface ReaderServerAddress { readonly host: string; readonly port: number }

export interface ReaderServer {
  readonly listen: (port?: number, host?: string) => Promise<ReaderServerAddress>;
  readonly close: () => Promise<void>;
}

const MIME: Readonly<Record<string, string>> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
};

export const createReaderServer = (options: { readonly staticRoot?: string } = {}): ReaderServer => {
  resetMemoryReadingSession();
  const displays = new Set<WebSocket>();
  const publish = (message: ServerMessage): void => {
    const encoded = encodeServerMessage(message);
    for (const socket of displays) if (socket.readyState === WebSocket.OPEN) socket.send(encoded);
  };
  const controller = new ReadingController(createRuntime("local"), new DeadlineCadenceScheduler(), publish);
  const staticRoot = resolve(options.staticRoot ?? join(process.cwd(), "dist", "web"));
  const http = createStaticServer(staticRoot);
  const sockets = new WebSocketServer({ noServer: true, maxPayload: 1_100_000 });
  const roles = new WeakMap<WebSocket, "display" | "control">();
  let commandQueue = Promise.resolve();

  http.on("upgrade", (request, socket, head) => {
    const url = new URL(request.url ?? "/", "http://localhost");
    const role = url.searchParams.get("role");
    if (url.pathname !== "/ws" || (role !== "display" && role !== "control")) {
      socket.destroy();
      return;
    }
    sockets.handleUpgrade(request, socket, head, (webSocket) => {
      roles.set(webSocket, role);
      sockets.emit("connection", webSocket, request);
    });
  });

  sockets.on("connection", (socket: WebSocket, _request: IncomingMessage) => {
    const role = roles.get(socket);
    if (role === "display") {
      displays.add(socket);
      void controller.initialMessages().then((messages) => {
        for (const message of messages) if (socket.readyState === WebSocket.OPEN) socket.send(encodeServerMessage(message));
      });
      socket.once("close", () => displays.delete(socket));
      return;
    }
    socket.on("message", (raw: RawData) => {
      commandQueue = commandQueue.then(async () => {
        try {
          const control = parseControlMessage(raw.toString());
          const response = await controller.handle(control);
          if (socket.readyState === WebSocket.OPEN) socket.send(encodeServerMessage(response));
        } catch (error) {
          const response: ServerMessage = {
            type: "error",
            code: "invalid-command",
            message: error instanceof Error ? error.message : "command failed.",
          };
          if (socket.readyState === WebSocket.OPEN) socket.send(encodeServerMessage(response));
        }
      });
    });
  });

  return {
    listen: (port = 4317, host = "127.0.0.1") => {
      if (host !== "127.0.0.1" && host !== "::1") return Promise.reject(new Error("v1 only permits loopback hosts."));
      return listen(http, port, host);
    },
    close: async () => {
      controller.close();
      for (const socket of sockets.clients) socket.close();
      sockets.close();
      if (!http.listening) return;
      await new Promise<void>((resolveClose, reject) => http.close((error) => error ? reject(error) : resolveClose()));
    },
  };
};

const listen = (server: HttpServer, port: number, host: string): Promise<ReaderServerAddress> =>
  new Promise((resolveListen, reject) => {
    server.once("error", reject);
    server.listen(port, host, () => {
      server.off("error", reject);
      const address = server.address();
      if (!address || typeof address === "string") return reject(new Error("server did not bind a TCP address."));
      resolveListen({ host, port: address.port });
    });
  });

const createStaticServer = (root: string): HttpServer => createServer((request, response) => {
  if (request.url === "/health") {
    response.writeHead(200, { "content-type": "application/json" });
    response.end('{"status":"ok"}');
    return;
  }
  const pathname = new URL(request.url ?? "/", "http://localhost").pathname;
  const relative = pathname === "/" ? "index.html" : normalize(pathname).replace(/^[/\\]+/, "");
  const candidate = resolve(root, relative);
  const fallback = join(root, "index.html");
  const file = candidate.startsWith(`${root}/`) && existsSync(candidate) ? candidate : fallback;
  if (!existsSync(file)) {
    response.writeHead(503, { "content-type": "text/plain; charset=utf-8" });
    response.end("Web display is not built. Run npm run build.");
    return;
  }
  response.writeHead(200, { "content-type": MIME[extname(file)] ?? "application/octet-stream" });
  createReadStream(file).pipe(response);
});
