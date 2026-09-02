import { Effect } from "effect";
import type { ReadingSessionRepositoryPortContract } from "./ports/reading-session-repository.js";
import { ReadingSessionPayload } from "./reading-session-payload.js";
import type { ReadingSession } from "./reading-session.js";

export const persistReadingSession = (
  repository: ReadingSessionRepositoryPortContract,
  session: ReadingSession,
) => ReadingSessionPayload.make(session.serialize()).pipe(
  Effect.flatMap((payload) => repository.write(payload)),
);
