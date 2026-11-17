// Runs before every dev session and deploy.
// Reads advisors.json, the advisor docs, the prompts and the question sheets,
// and packs them into one file the Worker can load (src/generated/material.json).
// The CSV sheets are parsed here with a proper CSV parser, so the Worker
// never has to parse anything at request time.
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "csv-parse/sync";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(join(root, p), "utf8").replace(/^﻿/, "");

const registry = JSON.parse(read("advisors.json"));
const advisors = registry.map((a) => {
  const rows = a.questions
    ? parse(read(a.questions), { columns: true, skip_empty_lines: true, trim: true })
    : null;
  if (rows && a.matchColumns) {
    for (const col of Object.keys(a.matchColumns)) {
      if (!(col in rows[0])) throw new Error(`${a.questions} has no column "${col}"`);
    }
  }
  const extraDocs = (a.extraDocs ?? []).map((e) => ({ ...e, docText: read(e.doc).trim() }));
  return { ...a, docText: read(a.doc).trim(), extraDocs, rows };
});

const prompts = {};
for (const f of readdirSync(join(root, "prompts"))) {
  if (f.endsWith(".md")) prompts[f.replace(/\.md$/, "")] = read(`prompts/${f}`).trim();
}

mkdirSync(join(root, "src/generated"), { recursive: true });
const out = join(root, "src/generated/material.json");
writeFileSync(out, JSON.stringify({ advisors, prompts }));
const kb = Math.round(readFileSync(out).length / 1024);
console.log(
  `Bundled ${advisors.length} advisors (${advisors
    .map((a) => `${a.id}${a.rows ? `: ${a.rows.length} questions` : ""}`)
    .join(", ")}), ${kb} KB`
);
