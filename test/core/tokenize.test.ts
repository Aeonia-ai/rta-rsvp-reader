import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { tokenize } from "../../src/core/tokenize.js";

describe("tokenize", () => {
  it("normalizes line endings and preserves attached punctuation", () => {
    assert.deepEqual(tokenize("  One\r\ntwo,  three. \r four—five "), ["One", "two,", "three.", "four—five"]);
  });

  it("returns no tokens for whitespace-only input", () => {
    assert.deepEqual(tokenize(" \n\t "), []);
  });
});
