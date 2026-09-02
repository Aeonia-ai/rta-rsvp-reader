import { Effect } from "effect";
import { Main } from "../context.js";
import { Operate } from "../messages/operate.js";
import { OperatorActionsPort } from "../ports/operator-actions.js";
export const OperateUseCase = Main.useCase({ name: "OperateUseCase", description: "Runs CLI effects through the declared operator port.", input: Operate, requires: [OperatorActionsPort], outcomes: ["completed"] as const, run: (input, useCase) => Effect.gen(function* () {
  const result = yield* useCase.get(OperatorActionsPort).execute(input);
  return yield* useCase.finish("completed", result);
}) });
