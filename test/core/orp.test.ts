import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { splitAtOrp } from "../../src/core/orp.js";

describe("splitAtOrp", () => {
  it("keeps the selected recognition character separate", () => {
    assert.deepEqual(splitAtOrp("that"), { token: "that", before: "t", focus: "h", after: "at" });
  });

  it("measures the lexical portion while retaining punctuation", () => {
    assert.deepEqual(splitAtOrp("“recognition”"), {
      token: "“recognition”",
      before: "“rec",
      focus: "o",
      after: "gnition”",
    });
  });

  it("operates over Unicode code points", () => {
    assert.deepEqual(splitAtOrp("éclair"), { token: "éclair", before: "éc", focus: "l", after: "air" });
  });

  it("still displays punctuation-only tokens", () => {
    assert.deepEqual(splitAtOrp("—"), { token: "—", before: "", focus: "—", after: "" });
  });
});
