import { Schema } from "effect";
import { Main } from "../context.js";

export const DisplayFrameContract = Main.contract({
  name: "DisplayFrame",
  version: 1,
  lifecycle: "current",
  schema: Schema.Struct({
    index: Schema.Number,
    total: Schema.Number,
    token: Schema.String,
    before: Schema.String,
    focus: Schema.String,
    after: Schema.String,
  }),
  examples: [{ index: 0, total: 1, token: "read", before: "r", focus: "e", after: "ad" }],
});
