import { useEffect, useState } from "react";
import type { ReadingSnapshot } from "../../../core/reading-session.js";
import { sendBrowserControl } from "../control-client.js";
import "./controls.css";

interface SampleSummary { readonly id: string; readonly name: string }
interface Sample extends SampleSummary { readonly text: string }
const speeds = [60, 120, 180, 240, 300, 400, 500, 600, 800, 1000, 1200];

export const ControlsPage = () => {
  const [samples, setSamples] = useState<readonly SampleSummary[]>([]);
  const [sampleId, setSampleId] = useState("demo");
  const [wpm, setWpm] = useState(600);
  const [status, setStatus] = useState<ReadingSnapshot>();
  const [error, setError] = useState<string>();
  useEffect(() => { void fetch("/api/samples").then((response) => response.json()).then(setSamples).catch(() => setError("Could not load samples.")); }, []);
  const execute = async (action: () => Promise<ReadingSnapshot>): Promise<void> => {
    setError(undefined);
    try { setStatus(await action()); } catch (reason) { setError(reason instanceof Error ? reason.message : "Control failed."); }
  };
  const load = async (): Promise<ReadingSnapshot> => {
    const sample = await fetch(`/api/samples/${encodeURIComponent(sampleId)}`).then(async (response) => {
      if (!response.ok) throw new Error("Sample is unavailable.");
      return await response.json() as Sample;
    });
    return sendBrowserControl({ command: "set-text", name: sample.name, text: sample.text });
  };
  return <main className="controls-page">
    <h1>RSVP Controls</h1>
    <label>Sample<select value={sampleId} onChange={(event) => setSampleId(event.target.value)}>{samples.map((sample) => <option key={sample.id} value={sample.id}>{sample.name}</option>)}</select></label>
    <label>WPM<select value={wpm} onChange={(event) => setWpm(Number(event.target.value))}>{speeds.map((speed) => <option key={speed} value={speed}>{speed}</option>)}</select></label>
    <div className="control-buttons">
      <button onClick={() => void execute(load)}>Load</button><button onClick={() => void execute(() => sendBrowserControl({ command: "set-speed", wpm }))}>Set speed</button>
      <button onClick={() => void execute(() => sendBrowserControl({ command: "play" }))}>Play</button><button onClick={() => void execute(() => sendBrowserControl({ command: "pause" }))}>Pause</button>
      <button onClick={() => void execute(() => sendBrowserControl({ command: "stop" }))}>Stop</button><button onClick={() => void execute(() => sendBrowserControl({ command: "status" }))}>Refresh status</button>
    </div>
    <output>{status ? `${status.documentName ?? "No document"} · ${status.phase} · ${status.index}/${status.total} · ${status.wpm} WPM` : "No status yet."}</output>
    {error ? <p role="alert">{error}</p> : null}
  </main>;
};
