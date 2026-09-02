import { Main } from "../context.js";
import type { OperatorAction } from "../ports/operator-actions.js";
export const Operate = Main.command<"Operate", OperatorAction>({
  name: "Operate",
  description: "Requests one CLI operator action.",
  summarize: (input) => input.action === "load" ? { action: input.action, path: input.path } : input,
});
