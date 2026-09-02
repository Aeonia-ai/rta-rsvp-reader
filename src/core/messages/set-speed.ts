import { Main } from "../context.js";
export interface SetSpeedInput { readonly wpm: number; }
export const SetSpeed = Main.command<"SetSpeed", SetSpeedInput>({ name: "SetSpeed", description: "Set one constant reading cadence in words per minute." });
