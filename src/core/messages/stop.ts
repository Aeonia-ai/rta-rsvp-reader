import { Main } from "../context.js";
export type StopInput = Readonly<Record<string, never>>;
export const Stop = Main.command<"Stop", StopInput>({ name: "Stop", description: "Stop reading and reset the cursor to the first token." });
