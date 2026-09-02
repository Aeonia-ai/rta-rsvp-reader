export const tokenize = (text: string): readonly string[] => {
  const normalized = text.replace(/\r\n?/gu, "\n").trim();
  return normalized.length === 0 ? [] : Object.freeze(normalized.split(/\s+/u));
};
