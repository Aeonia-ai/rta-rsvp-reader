import { Effect } from "effect";
import { Main } from "../context.js";
import { SetSpeed } from "../messages/set-speed.js";
import { ReadingSessionRepositoryPort } from "../ports/reading-session-repository.js";
import { persistReadingSession } from "../persist-reading-session.js";
export const SetSpeedUseCase = Main.useCase({ name: "SetSpeedUseCase", description: "Changes the constant cadence.", input: SetSpeed, requires: [ReadingSessionRepositoryPort], outcomes: ["updated"] as const, run: (input, useCase) => Effect.gen(function* () {
  const repository = useCase.get(ReadingSessionRepositoryPort);
  const updated = (yield* repository.read()).setSpeed(input.wpm);
  yield* persistReadingSession(repository, updated);
  return yield* useCase.finish("updated", updated.snapshot());
}) });
