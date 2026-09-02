import assert from "node:assert/strict";
import { describe, it } from "node:test";

const loadLibrary = async () => import("../../src/server/sample-library.js").catch(() => undefined);

describe("sample library", () => {
  it("exposes only bundled samples by stable identifier", async () => {
    const library = await loadLibrary();
    assert.ok(library, "sample library should exist");
    if (!library) return;

    assert.deepEqual(await library.listSamples(), [
      { id: "demo", name: "Demo" },
      { id: "calibration", name: "Calibration" },
    ]);
    assert.match((await library.readSample("demo"))?.text ?? "", /presentation/i);
    assert.equal(await library.readSample("../../package"), undefined);
  });
});
