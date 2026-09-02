import React from "react";
import type { DisplayFrame } from "../../../core/reading-session.js";

export interface ReaderDisplayProps { readonly frame?: DisplayFrame }

export const ReaderDisplay = ({ frame }: ReaderDisplayProps) => (
  <main className="reader-display" aria-label="Rapid serial visual presentation reader">
    <div className="target" aria-hidden="true">
      <span className="target-line" />
      <span className="target-tick target-tick-top" />
      <span className="target-tick target-tick-bottom" />
    </div>
    {frame ? (
      <div className="word" aria-label={frame.token}>
        <span className="word-before">{frame.before}</span>
        <span className="word-focus">{frame.focus}</span>
        <span className="word-after">{frame.after}</span>
      </div>
    ) : null}
  </main>
);
