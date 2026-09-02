import { createRoot } from "react-dom/client";
import { createWebRuntime } from "../runtime/browser-runtime.js";
import { webOperations } from "../rta/generated-contract.js";

const runtime = createWebRuntime();
const App = () => <main data-runtime={typeof runtime.bootstrap}>RTA web application: {webOperations.join(", ")}</main>;
createRoot(document.getElementById("root")!).render(<App />);
