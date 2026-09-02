import { Main } from "./context.js";

export const ReadingSessionPayload = Main.secret({
  name: "ReadingSessionPayload",
  description: "Opaque reading state whose document tokens must never enter evidence.",
  rules: [Main.secretRule.pattern("serialized-session", /^\{[\s\S]*\}$/)],
  redaction: { label: "reading-session" },
});
