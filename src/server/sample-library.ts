import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const samples = {
  demo: { name: "Demo", path: "samples/demo.txt" },
  calibration: { name: "Calibration", path: "samples/calibration.txt" },
} as const;

export interface SampleSummary { readonly id: keyof typeof samples; readonly name: string }
export interface Sample extends SampleSummary { readonly text: string }

export const listSamples = async (): Promise<readonly SampleSummary[]> => Object.entries(samples).map(([id, sample]) => ({
  id: id as keyof typeof samples,
  name: sample.name,
}));

export const readSample = async (id: string): Promise<Sample | undefined> => {
  const sample = samples[id as keyof typeof samples];
  if (!sample) return undefined;
  return { id: id as keyof typeof samples, name: sample.name, text: await readFile(resolve(process.cwd(), sample.path), "utf8") };
};
