# AI Advisory Council

A connector for Claude with four advisors, each a master of one field, plus a way to ask the whole council at once.

| Advisor | Field | Tool |
| --- | --- | --- |
| Socrates | Questioning: definitions, assumptions, contradictions | `ask_socrates` |
| Sun Tzu | Strategy: positioning, timing, strengths and weaknesses | `ask_sun_tzu` |
| Marshall McLuhan | Technology and media: whether a product idea has legs | `ask_mcluhan` |
| Marcus Aurelius | Way of life: temperament, setbacks, other people | `ask_marcus_aurelius` |
| The whole council | Socrates opens with a few questions, then the relevant advisors answer | `ask_the_council` |

The server does no thinking. It hands over each advisor's material, and your own Claude writes the advice from it. There are no accounts and nothing is stored.

Part of [Build 52](https://ahmads.build), one agent a week, built in public. The page for this agent is at [advisorycouncil.ahmads.build](https://advisorycouncil.ahmads.build).

## Add it to Claude

1. In Claude, open **Settings → Connectors → Add custom connector**.
2. Paste the server address: `https://advisorycouncil.ahmads.build/mcp`
3. Start a chat and say "ask the council whether I should…", or "ask Sun Tzu about this".

Say "skip to the council" to go past Socrates' opening questions.

## Add an advisor

1. Put the advisor's document in `advisors/` as a Markdown file.
2. Add one entry to `advisors.json` (copy the Sun Tzu entry and change the fields).
3. Optional: attach further documents to an advisor with `"extraDocs"` (see the McLuhan entry).
4. Optional: add a question sheet as a CSV in `questions/`, point `"questions"` at it, and list the columns to match on in `"matchColumns"`.

No code changes are needed. The wording every advisor shares lives in `prompts/`.

## Run it on your own machine

```
npm install
npm run dev      # starts the server at http://localhost:8787/mcp
npm run check    # in a second terminal: runs the local checks
```

## How it is put together

- `src/index.ts`: the front door. Applies a rate limit and routes `/mcp`.
- `src/server.ts`: defines the five tools.
- `src/material.ts`: loads the advisor docs, prompts and question rows.
- `src/match.ts`: keyword matching that picks the 5 closest question rows.
- `scripts/bundle-material.mjs`: packs the content into the Worker before each run.
- `public/index.html`: the web page shown at the root address.

It runs on Cloudflare Workers using Cloudflare's `agents` package and the official MCP SDK.

## Status (17 November 2026)

Deployed to Cloudflare and passing all checks: five tools, question matching, rate limit.
Live at `advisorycouncil.ahmads.build`. The Xanadu decision has been run through the council in Claude.
Next: the other two test decisions, the Chief of Staff link, and the tutorial.
