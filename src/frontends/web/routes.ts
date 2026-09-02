export type WebRoute = "landing" | "glasses" | "controls";

export const selectRoute = (pathname: string): WebRoute =>
  pathname === "/glasses-app" ? "glasses" : pathname === "/controls" ? "controls" : "landing";

export const glassesAppUrl = (origin: string): string => new URL("/glasses-app", origin).toString();
