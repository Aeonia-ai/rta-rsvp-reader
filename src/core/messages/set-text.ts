import { Main } from "../context.js";
export interface SetTextInput { readonly name: string; readonly text: string; }
export const SetText = Main.command<"SetText", SetTextInput>({
  name: "SetText",
  description: "Replace the in-memory document and reset its cursor.",
  summarize: (input) => ({ name: input.name, characters: input.text.length }),
});
