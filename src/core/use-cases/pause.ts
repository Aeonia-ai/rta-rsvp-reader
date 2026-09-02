import { Effect } from "effect";
import { Main } from "../context.js";
import { Pause } from "../messages/pause.js";
import { ReadingSessionRepositoryPort } from "../ports/reading-session-repository.js";
import { persistReadingSession } from "../persist-reading-session.js";
export const PauseUseCase = Main.useCase({ name: "PauseUseCase", description: "Pauses at the current token.", input: Pause, requires: [ReadingSessionRepositoryPort], outcomes: ["paused"] as const, run: (_input, useCase) => Effect.gen(function* () {
  const repository = useCase.get(ReadingSessionRepositoryPort);
  const updated = (yield* repository.read()).pause();
  yield* persistReadingSession(repository, updated);
  return yield* useCase.finish("paused", updated.snapshot());
}) });
