// Loads everything the advisors know: docs, prompts and question rows.
// The content is packed at build time by scripts/bundle-material.mjs.
import bundle from "./generated/material.json";

export type Row = Record<string, string>;

export interface Advisor {
  id: string;
  name: string;
  field: string;
  tool: string;
  description: string;
  summary: string;
  doc: string;
  questions: string | null;
  /** Which sheet columns to match against, and how much each one counts. */
  matchColumns?: Record<string, number>;
  /** Optional extra line added to the dialogue instruction for this advisor. */
  dialogueNote?: string;
  /** Further documents sent with this advisor's main doc. */
  extraDocs: { title: string; doc: string; note?: string; docText: string }[];
  docText: string;
  rows: Row[] | null;
}

const data = bundle as unknown as { advisors: Advisor[]; prompts: Record<string, string> };

export const advisors: Advisor[] = data.advisors;

export function prompt(name: string): string {
  const text = data.prompts[name];
  if (!text) throw new Error(`Missing prompt: prompts/${name}.md`);
  return text;
}

export function advisorById(id: string): Advisor {
  const a = advisors.find((x) => x.id === id);
  if (!a) throw new Error(`Unknown advisor: ${id}`);
  return a;
}
