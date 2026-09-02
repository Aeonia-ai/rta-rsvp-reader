import { Main } from "../context.js";
export const Frame = Main.query<"Frame", Record<string, never>>({
  name: "Frame",
  description: "Reads the current display frame and cadence.",
});
