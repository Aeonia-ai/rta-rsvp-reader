import { Main } from "../context.js";
export const Advance = Main.command<"Advance", Record<string, never>>({
  name: "Advance",
  description: "Advances exactly one token on the server cadence.",
});
