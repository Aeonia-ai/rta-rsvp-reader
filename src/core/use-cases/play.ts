import { Effect } from "effect";
import { Main } from "../context.js";
import { Play } from "../messages/play.js";
import { ReadingSessionRepositoryPort } from "../ports/reading-session-repository.js";
import { persistReadingSession } from "../persist-reading-session.js";
export const PlayUseCase = Main.useCase({ name: "PlayUseCase", description: "Starts or resumes the reader.", input: Play, requires: [ReadingSessionRepositoryPort], outcomes: ["playing"] as const, run: (_input, useCase) => Effect.gen(function* () {
  const repository = useCase.get(ReadingSessionRepositoryPort);
  const updated = (yield* repository.read()).play();
  yield* persistReadingSession(repository, updated);
  return yield* useCase.finish("playing", updated.snapshot());
}) });
