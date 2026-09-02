#!/usr/bin/env node
import { createReaderServer } from "../server/reader-server.js";

const index = process.argv.indexOf("--port");
const port = index < 0 ? 4317 : Number(process.argv[index + 1]);
if (!Number.isInteger(port) || port < 1 || port > 65_535) throw new Error("invalid server port.");
const server = createReaderServer();
const address = await server.listen(port);
console.log(`RSVP reader listening on http://${address.host}:${address.port}`);
const close = (): void => { void server.close().then(() => process.exit(0)); };
process.once("SIGINT", close);
process.once("SIGTERM", close);
