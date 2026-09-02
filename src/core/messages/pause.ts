import { Main } from "../context.js";
export type PauseInput = Readonly<Record<string, never>>;
export const Pause = Main.command<"Pause", PauseInput>({ name: "Pause", description: "Pause without advancing the reading cursor." });
