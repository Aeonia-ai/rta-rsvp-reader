import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ReaderDisplay } from "../../src/frontends/web/app/reader-display.js";

describe("ReaderDisplay", () => {
  it("renders a fixed ORP target with no controls or chrome", () => {
    const markup = renderToStaticMarkup(<ReaderDisplay frame={{
      index: 0, total: 1, token: "recognition", before: "rec", focus: "o", after: "gnition",
    }} />);
    assert.match(markup, /class="reader-display"/);
    assert.match(markup, /class="word-focus"[^>]*>o</);
    assert.doesNotMatch(markup, /<(button|input|select|textarea)/);
    assert.doesNotMatch(markup, /1 of 1|300 WPM/i);
  });

  it("renders only the optical target when no frame is active", () => {
    const markup = renderToStaticMarkup(<ReaderDisplay />);
    assert.match(markup, /aria-hidden="true"/);
    assert.doesNotMatch(markup, /word-focus/);
  });
});
