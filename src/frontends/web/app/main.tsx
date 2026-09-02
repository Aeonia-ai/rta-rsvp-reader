import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import type { DisplayFrame } from "../../../core/reading-session.js";
import { createWebRuntime } from "../runtime/browser-runtime.js";
import { createDisplaySocketAdapter } from "../rta/adapters/browser.js";
import { ReaderDisplay } from "./reader-display.js";
import "./display.css";
import { selectRoute } from "../routes.js";
import { LandingPage } from "./landing-page.js";
import { ControlsPage } from "./controls-page.js";

createWebRuntime();
const GlassesApp = () => {
  const [frame, setFrame] = useState<DisplayFrame>();
  useEffect(() => createDisplaySocketAdapter((event) => {
    setFrame(event.type === "frame" ? event.frame : undefined);
  }).close, []);
  return <ReaderDisplay frame={frame} />;
};
const App = () => {
  switch (selectRoute(location.pathname)) {
    case "glasses": return <GlassesApp />;
    case "controls": return <ControlsPage />;
    default: return <LandingPage />;
  }
};
createRoot(document.getElementById("root")!).render(<App />);
