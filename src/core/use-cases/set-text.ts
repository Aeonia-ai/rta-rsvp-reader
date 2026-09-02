import { Effect } from "effect";
import { Main } from "../context.js";
import { SetText } from "../messages/set-text.js";
import { ReadingSessionRepositoryPort } from "../ports/reading-session-repository.js";
import { persistReadingSession } from "../persist-reading-session.js";
export const SetTextUseCase = Main.useCase({ name: "SetTextUseCase", description: "Loads text without recording its contents.", input: SetText, requires: [ReadingSessionRepositoryPort], outcomes: ["loaded"] as const, run: (input, useCase) => Effect.gen(function* () {
  const repository = useCase.get(ReadingSessionRepositoryPort);
  const updated = (yield* repository.read()).setText(input);
  yield* persistReadingSession(repository, updated);
  return yield* useCase.finish("loaded", updated.snapshot());
}) });
