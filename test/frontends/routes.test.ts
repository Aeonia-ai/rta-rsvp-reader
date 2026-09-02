import assert from "node:assert/strict";
import { describe, it } from "node:test";

const loadRoutes = async () => import("../../src/frontends/web/routes.js").catch(() => undefined);

describe("web routes", () => {
  it("selects the landing, glasses, and controls surfaces", async () => {
    const routes = await loadRoutes();
    assert.ok(routes, "web route helpers should exist");
    if (!routes) return;
    assert.equal(routes.selectRoute("/"), "landing");
    assert.equal(routes.selectRoute("/glasses-app"), "glasses");
    assert.equal(routes.selectRoute("/controls"), "controls");
    assert.equal(routes.selectRoute("/unknown"), "landing");
    assert.equal(routes.glassesAppUrl("https://reader.example"), "https://reader.example/glasses-app");
  });
});
