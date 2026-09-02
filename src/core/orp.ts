export interface OrpSplit {
  readonly token: string;
  readonly before: string;
  readonly focus: string;
  readonly after: string;
}

const isLexical = (point: string): boolean => /[\p{L}\p{N}]/u.test(point);

const recognitionOffset = (length: number): number => {
  if (length <= 1) return 0;
  if (length <= 5) return 1;
  if (length <= 9) return 2;
  if (length <= 13) return 3;
  return 4;
};

export const splitAtOrp = (token: string): OrpSplit => {
  const points = Array.from(token);
  const lexicalIndexes = points.flatMap((point, index) => isLexical(point) ? [index] : []);
  const pivot = lexicalIndexes.length === 0
    ? 0
    : lexicalIndexes[Math.min(recognitionOffset(lexicalIndexes.length), lexicalIndexes.length - 1)]!;

  return Object.freeze({
    token,
    before: points.slice(0, pivot).join(""),
    focus: points[pivot] ?? "",
    after: points.slice(pivot + 1).join(""),
  });
};
