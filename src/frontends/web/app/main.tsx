import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import type { DisplayFrame } from "../../../core/reading-session.js";
import { createWebRuntime } from "../runtime/browser-runtime.js";
import { createDisplaySocketAdapter } from "../rta/adapters/browser.js";
import { ReaderDisplay } from "./reader-display.js";
import "./display.css";

createWebRuntime();
const App = () => {
  const [frame, setFrame] = useState<DisplayFrame>();
  useEffect(() => createDisplaySocketAdapter((event) => {
    setFrame(event.type === "frame" ? event.frame : undefined);
  }).close, []);
  return <ReaderDisplay frame={frame} />;
};
createRoot(document.getElementById("root")!).render(<App />);
