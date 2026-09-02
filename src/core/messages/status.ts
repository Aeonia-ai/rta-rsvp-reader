import { Main } from "../context.js";
export type StatusInput = Readonly<Record<string, never>>;
export const Status = Main.query<"Status", StatusInput>({ name: "Status", description: "Read the public reading-session state." });
