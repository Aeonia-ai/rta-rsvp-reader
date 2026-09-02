export { createWebKernel, type WebKernelDependencies } from "../../browser/kernel.js";

// This intentionally exports no component tree. The application chooses React,
// Svelte, plain DOM, or another renderer above the generated browser kernel.
