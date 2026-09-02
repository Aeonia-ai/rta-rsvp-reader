import { Schema } from "effect";
import { Main } from "../context.js";

export const ExampleContract = Main.contract({
  name: "ExampleEvent",
  version: 1,
  schema: Schema.Struct({ id: Schema.String }),
  lifecycle: "current",
  examples: [{ id: "example-1" }],
});
