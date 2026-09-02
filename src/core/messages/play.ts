import { Main } from "../context.js";
export type PlayInput = Readonly<Record<string, never>>;
export const Play = Main.command<"Play", PlayInput>({ name: "Play", description: "Begin or resume the loaded reading session." });
