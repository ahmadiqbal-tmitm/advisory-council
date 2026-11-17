// Local checks from the build brief. Start the server first (npm run dev),
// then run: npm run check            (or: npm run check -- https://your-url/mcp)
const url = process.argv[2] ?? "http://localhost:8787/mcp";
let id = 0, failed = 0;

async function rpc(method, params) {
  const started = Date.now();
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json, text/event-stream" },
    body: JSON.stringify({ jsonrpc: "2.0", id: ++id, method, params }),
  });
  const raw = await res.text();
  const line = raw.split("\n").find((l) => l.startsWith("data: "));
  const json = JSON.parse(line ? line.slice(6) : raw);
  return { json, ms: Date.now() - started };
}
const call = async (name, args) => {
  const { json, ms } = await rpc("tools/call", { name, arguments: args });
  return { text: json.result?.content?.[0]?.text ?? "", isError: !!json.result?.isError, raw: json, ms };
};
function check(label, ok, detail = "") {
  if (!ok) failed++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? `  (${detail})` : ""}`);
}
const has = (t, ...parts) => parts.every((p) => t.includes(p));
const order = (t, ...parts) => parts.every((p, i) => i === 0 || t.indexOf(parts[i - 1]) < t.indexOf(p));
const rowQuestions = (t) => [...t.matchAll(/^Question: (.*)$/gm)].map((m) => m[1]);

await rpc("initialize", { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "local-check", version: "0" } });
const tools = (await rpc("tools/list", {})).json.result.tools.map((t) => t.name);
check("five tools are listed", tools.length === 5, tools.join(", "));

const sun = await call("ask_sun_tzu", { question: "A bigger competitor just copied my product. What now?" });
const S = ["===== SHARED RULES", "===== SOURCE MATERIAL: SUN TZU", "===== WHAT TO DO NOW"];
check("ask_sun_tzu: shared rules, then his doc, then the dialogue instruction", has(sun.text, ...S) && order(sun.text, ...S), `${sun.text.length} chars`);
check("ask_sun_tzu: no question rows (he has no sheet)", !sun.text.includes("CLOSEST QUESTIONS"));

const mcl = await call("ask_mcluhan", { question: "Does a voice-first agent for accountants have legs?" });
check("ask_mcluhan: returns his doc, then the Ong brief", has(mcl.text, "===== SOURCE MATERIAL: MARSHALL MCLUHAN", "===== FURTHER MATERIAL FOR MARSHALL MCLUHAN", "Twelve insights"), `${mcl.text.length} chars`);

const marcus = await call("ask_marcus_aurelius", { question: "How do I stop worrying about the future?" });
const mq = rowQuestions(marcus.text);
check("ask_marcus_aurelius: 5 matching rows for the worry question", mq.length === 5, mq[0]);
check("ask_marcus_aurelius: rows carry their passages", (marcus.text.match(/^Passage \(Chrystal translation, 1902\): /gm) ?? []).length >= 4);

const soc = await call("ask_socrates", { question: "Should I take on a business partner?" });
check("ask_socrates: doc, 5 rows, one-on-one note", has(soc.text, "===== SOURCE MATERIAL: SOCRATES", "How a conversation runs") && rowQuestions(soc.text).length === 5, rowQuestions(soc.text)[0]);

const council = await call("ask_the_council", { question: "Should I join Xanadu, a potential partnership on a Claude and AI workflow implementation service?" });
const C = ["===== SHARED RULES", "===== COUNCIL FLOW", "===== SOURCE MATERIAL: SOCRATES", "===== CLOSEST QUESTIONS", "===== THE OTHER ADVISORS"];
check("ask_the_council: rules, flow, Socrates material, rows, advisor list", has(council.text, ...C) && order(council.text, ...C));
check("ask_the_council: lists the other three advisors by tool", has(council.text, "ask_sun_tzu", "ask_mcluhan", "ask_marcus_aurelius"));

const ctx = await call("ask_sun_tzu", { question: "Which option?", context: "BRIEF-MARKER-123" });
check("context is passed through", ctx.text.includes("BRIEF-MARKER-123"));

for (const args of [{ question: "" }, { question: "   " }]) {
  const r = await call("ask_the_council", args);
  check(`empty question (${JSON.stringify(args.question)}) gives a polite error, not a crash`, r.isError && r.text.includes("needs a question"));
}
const missing = await call("ask_socrates", {});
check("missing question is refused cleanly", missing.isError || !!missing.raw.error, (missing.text || missing.raw.error?.message || "").slice(0, 80));

const slow = [sun, mcl, marcus, soc, council].map((r) => r.ms);
check("every tool answers within 2 seconds", Math.max(...slow) < 2000, `slowest ${Math.max(...slow)} ms`);

console.log("\nKeyword matching: ten sample questions (read these by eye)\n");
const samples = [
  ["ask_marcus_aurelius", "How do I stop worrying about the future?"],
  ["ask_marcus_aurelius", "My colleague took credit for my work and I am furious."],
  ["ask_marcus_aurelius", "I failed at something important and feel ashamed."],
  ["ask_marcus_aurelius", "How do I deal with criticism from people online?"],
  ["ask_marcus_aurelius", "I keep procrastinating in the morning."],
  ["ask_marcus_aurelius", "Should I angel invest in a friend's business?"],
  ["ask_socrates", "Should I join a partnership with someone on an AI services business?"],
  ["ask_socrates", "Should I build my own team, join one, or go solo?"],
  ["ask_socrates", "Is it wise to invest money in a friend's company?"],
  ["ask_socrates", "How do I know if I am a good parent?"],
];
for (const [tool, question] of samples) {
  const r = await call(tool, { question });
  const qs = rowQuestions(r.text);
  console.log(`${tool}  "${question}"`);
  if (qs.length === 0) console.log("   (no close rows)");
  qs.forEach((q) => console.log(`   - ${q}`));
}
console.log(failed ? `\n${failed} check(s) FAILED` : "\nAll checks passed");
process.exit(failed ? 1 : 0);
