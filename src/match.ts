// Simple keyword matching for the question sheets. No AI, no embeddings.
// It scores every row by how many of the person's meaningful words it shares,
// counting rare words more than common ones, and returns the best few.
import type { Row } from "./material";

const STOP = new Set(
  ("a an the and or but if so of to in on at for from by with about into over after before between " +
    "is are was were be been being am do does did done have has had having will would shall should can could may might must " +
    "i me my mine myself we us our you your he she it its they them their this that these those there here " +
    "what which who whom whose when where why how not no nor than then too very just also only own same such both each more most other some any all " +
    "as up out off again once get got go going want wants need needs thing things really still even much many").split(" ")
);

/** Cut a word down to a rough root so "worrying", "worried" and "worries" all match "worry". */
function stem(w: string): string {
  if (w.length > 7 && w.endsWith("ship")) w = w.slice(0, -4); // partnership -> partner
  if (w.length > 5 && w.endsWith("ying")) return w.slice(0, -4) + "y";
  if (w.length > 4 && w.endsWith("ies")) return w.slice(0, -3) + "y";
  if (w.length > 4 && w.endsWith("ied")) return w.slice(0, -3) + "y";
  if (w.length > 5 && w.endsWith("ing")) w = w.slice(0, -3);
  else if (w.length > 4 && w.endsWith("ed")) w = w.slice(0, -2);
  else if (w.length > 3 && w.endsWith("s") && !w.endsWith("ss")) w = w.slice(0, -1);
  if (w.length > 3 && w.endsWith("e")) w = w.slice(0, -1);
  if (w.length > 3 && w[w.length - 1] === w[w.length - 2]) w = w.slice(0, -1);
  return w;
}

export function tokens(text: string): string[] {
  return (text.toLowerCase().match(/[a-z']+/g) ?? [])
    .map((w) => w.replace(/'s$|'/g, ""))
    .filter((w) => w.length > 1 && !STOP.has(w))
    .map(stem);
}

export interface Match {
  row: Row;
  score: number;
}

export function closestRows(
  query: string,
  rows: Row[],
  columns: Record<string, number>,
  limit = 5
): Match[] {
  const q = [...new Set(tokens(query))];
  if (q.length === 0) return [];

  // Words each row holds, per column.
  const rowWords = rows.map((row) =>
    Object.keys(columns).map((col) => new Set(tokens(row[col] ?? "")))
  );

  // How rare each query word is across the sheet (rare words count for more).
  const rarity = new Map<string, number>();
  for (const word of q) {
    const hits = rowWords.filter((cols) => cols.some((set) => set.has(word))).length;
    rarity.set(word, Math.log(1 + rows.length / (1 + hits)));
  }

  const weights = Object.values(columns);
  const scored = rows.map((row, i) => {
    let score = 0;
    for (const word of q) {
      let best = 0;
      rowWords[i].forEach((set, c) => {
        if (set.has(word)) best = Math.max(best, weights[c]);
      });
      score += best * (rarity.get(word) ?? 0);
    }
    return { row, score };
  });

  return scored
    .filter((m) => m.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
