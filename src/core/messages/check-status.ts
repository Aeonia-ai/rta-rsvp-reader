import { Main } from "../context.js";
export const CheckStatus = Main.query<"CheckStatus", Record<string, never>>({ name: "CheckStatus", description: "Reports whether the generated application is currently up." });
