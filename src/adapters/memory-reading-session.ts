import { Effect } from "effect";
import { Main } from "../core/context.js";
import { ReadingSessionRepositoryPort } from "../core/ports/reading-session-repository.js";
import { ReadingSession } from "../core/reading-session.js";

let current = ReadingSession.empty();

export const resetMemoryReadingSession = (wpm = 300): void => {
  current = ReadingSession.empty(wpm);
};

export const MemoryReadingSession = Main.adapter({
  name: "MemoryReadingSession",
  description: "Keeps the single authoritative reading session in process memory.",
  port: ReadingSessionRepositoryPort,
  runtimes: ["browser", "local"],
  implementation: {
    read: () => Effect.succeed(current),
    write: (serialized: string) => Effect.sync(() => { current = ReadingSession.deserialize(serialized); }),
  },
});
