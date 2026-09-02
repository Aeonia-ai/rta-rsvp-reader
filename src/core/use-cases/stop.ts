import { Effect } from "effect";
import { Main } from "../context.js";
import { Stop } from "../messages/stop.js";
import { ReadingSessionRepositoryPort } from "../ports/reading-session-repository.js";
import { persistReadingSession } from "../persist-reading-session.js";
export const StopUseCase = Main.useCase({ name: "StopUseCase", description: "Stops and rewinds the reader.", input: Stop, requires: [ReadingSessionRepositoryPort], outcomes: ["stopped"] as const, run: (_input, useCase) => Effect.gen(function* () {
  const repository = useCase.get(ReadingSessionRepositoryPort);
  const updated = (yield* repository.read()).stop();
  yield* persistReadingSession(repository, updated);
  return yield* useCase.finish("stopped", updated.snapshot());
}) });
