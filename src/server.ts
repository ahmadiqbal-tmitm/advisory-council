// Defines the five tools. None of them writes advice: each one hands over
// material, and the person's own Claude writes the advice from it.
import { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import { advisors, advisorById, prompt, type Advisor } from "./material";
import { closestRows } from "./match";

const inputSchema = {
  question: z.string().describe("The person's question or situation, in their own words."),
  context: z
    .string()
    .optional()
    .describe("Anything already established, for example the brief Socrates produced."),
};

type Input = { question: string; context?: string };
const text = (t: string, isError = false) => ({ content: [{ type: "text" as const, text: t }], isError });

const EMPTY =
  "The council needs a question to work with. Please ask the person what they would like to bring to the council, then call this tool again with their words in `question`.";

function section(title: string, body: string): string {
  return `===== ${title} =====\n\n${body.trim()}`;
}

function request({ question, context }: Input): string {
  return section(
    "THE PERSON'S QUESTION",
    question.trim() + (context?.trim() ? `\n\nContext already established:\n${context.trim()}` : "")
  );
}

function questionRows(a: Advisor, input: Input): string | null {
  if (!a.rows || !a.matchColumns) return null;
  const matches = closestRows(`${input.question} ${input.context ?? ""}`, a.rows, a.matchColumns, 5);
  const title = `CLOSEST QUESTIONS FROM ${a.name.toUpperCase()}'S QUESTION SHEET`;
  if (matches.length === 0) {
    return section(
      title,
      "No row in the sheet is close to this question. Reason from the core principles in the material above, and say that the sheet does not cover it."
    );
  }
  const body = matches
    .map(({ row }) =>
      Object.entries(row)
        .filter(([, v]) => v !== "")
        .map(([k, v]) => `${k}: ${v}`)
        .join("\n")
    )
    .join("\n\n---\n\n");
  return section(title, body);
}

function material(a: Advisor): string {
  const main = section(`SOURCE MATERIAL: ${a.name.toUpperCase()} (${a.field})`, a.docText);
  const extras = a.extraDocs.map((e) =>
    section(
      `FURTHER MATERIAL FOR ${a.name.toUpperCase()}: ${e.title}`,
      (e.note ? `${e.note}\n\n` : "") + e.docText
    )
  );
  return [main, ...extras].join("\n\n");
}

export function advisorBriefing(a: Advisor, input: Input): string {
  const closing = prompt("dialogue") + (a.dialogueNote ? `\n\n${a.dialogueNote}` : "");
  return [
    section("SHARED RULES", prompt("shared-rules")),
    request(input),
    material(a),
    questionRows(a, input),
    section("WHAT TO DO NOW", closing),
  ]
    .filter(Boolean)
    .join("\n\n");
}

export function councilBriefing(input: Input): string {
  const socrates = advisorById("socrates");
  const others = advisors
    .filter((a) => a.id !== "socrates")
    .map((a) => `- ${a.name} (${a.tool}): ${a.summary}`)
    .join("\n");
  return [
    section("SHARED RULES", prompt("shared-rules")),
    request(input),
    section("COUNCIL FLOW", prompt("council-flow")),
    material(socrates),
    questionRows(socrates, input),
    section(
      "THE OTHER ADVISORS",
      `Socrates can suggest any of these. Call an advisor's tool with the brief as \`context\` to get their material.\n\n${others}`
    ),
  ]
    .filter(Boolean)
    .join("\n\n");
}

export function createServer(): McpServer {
  const server = new McpServer(
    { name: "AI Advisory Council", version: "0.1.0" },
    { instructions: prompt("server-instructions") }
  );

  for (const a of advisors) {
    server.registerTool(
      a.tool,
      { title: `Ask ${a.name}`, description: a.description, inputSchema, annotations: { readOnlyHint: true } },
      async (input: Input) => (input.question?.trim() ? text(advisorBriefing(a, input)) : text(EMPTY, true))
    );
  }

  server.registerTool(
    "ask_the_council",
    {
      title: "Ask the council",
      description:
        "Bring a decision or question to the whole AI Advisory Council. Socrates opens with one short question, gives his understanding, then the relevant advisors answer in their own words. Follow the returned flow exactly: your first reply is only 'Socrates: <question>'. Say 'skip to the council' to go straight to the advisors.",
      inputSchema,
      annotations: { readOnlyHint: true },
    },
    async (input: Input) => (input.question?.trim() ? text(councilBriefing(input)) : text(EMPTY, true))
  );

  return server;
}
