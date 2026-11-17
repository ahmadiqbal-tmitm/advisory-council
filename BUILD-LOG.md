# Build log

## Tuesday 17 November 2026

Times are Dubai time and approximate.

**12:30** Read the build brief. Chose the project name `advisory-council`.

**12:35 Source material.** The four advisor docs and the Socrates sheet arrived as exported. Two things differed from the brief:
- The Marcus sheet came as an Excel file, not CSV. Converted it to `questions/marcus-aurelius.csv` (500 rows, 9 columns, nothing changed in the cells). The original is kept in `source-exports/`.
- A seventh file arrived, "Tertiary Orality…", which the brief does not mention. See 13:10 below.
- `source-exports/` is left out of git.

**12:36 A change from the brief: no McpAgent.** The brief names Cloudflare's `McpAgent` class. Cloudflare's current docs (updated 27 October 2026) mark it as deprecated and recommend `createMcpHandler` from the same `agents` package instead. The new way is stateless, which is exactly what the brief asks for, and needs less code. The MCP SDK package is now `@modelcontextprotocol/server`.

**12:36 A second change: no /sse.** The older SSE transport is deprecated and the recommended handler does not serve it. `/sse` answers with a note pointing to `/mcp`.

**12:38 Content packing.** Total material is about 540 KB, far below the Worker size limit, so everything is bundled and nothing needs KV or R2. A small script packs the docs, prompts and sheets before each run. It parses the CSVs with a proper parser at that point, so the Worker never parses anything while answering.

**12:40 Built** the four advisor tools and `ask_the_council`, all driven by `advisors.json`.

**12:42 Local checks pass.** Five tools listed; each returns in under 10 ms; the Marcus worry question returns 5 rows with passages; empty questions get a polite error.

**12:45 Two changes from Ahmad.**
- The Tertiary Orality brief (on Walter Ong, a student of McLuhan) now goes out with McLuhan's doc. It lives at `advisors/mcluhan-tertiary-orality.md` and is attached through a new optional `extraDocs` list in `advisors.json`, so any advisor can carry more than one document.
- The income figure in the Marcus doc is replaced with `$X` in the repo copy. The original Claude doc is unchanged, so a fresh export would bring the number back. The first local snapshot was rewritten so the number is not in the git history.

**12:50 Deployed.** Live at `https://advisory-council.advisory-council.workers.dev/mcp`. Upload is 374 KB compressed, start-up 47 ms. All checks pass against the live address; the slowest tool answers in about a quarter of a second.
- The Cloudflare account had no `workers.dev` name yet, so the deploy registered one, `advisory-council`. That is why the name appears twice in the address. It can be changed in the Cloudflare dashboard, and the custom domain will replace it anyway.

**13:10 First real test, and a change of voice.** The Xanadu question worked end to end in Claude: Socrates opened, wrote a brief, and three advisors answered. But the replies were walls of text, and the advisors were described from outside ("Sun Tzu looks first at the ground…") instead of speaking. Ahmad's changes, all made in `prompts/` with no code touched:
- The first reply is one line: `Socrates: <question>`. No introduction, no explanation of the process.
- The brief is now "Socrates: My understanding", five short lines, then the suggested advisors, then one line asking whether to get their advice.
- Every advisor speaks for themselves, to "you", starting with their name and a colon, in about 80 words at most. This replaces the brief's original "mentor voice, not as I" rule. It also sets things up for a later version where each advisor has their own voice on a call.
- The close is three single lines: where they agree, where they differ, the council's leaning.
- Principle numbers are gone; a principle is named in a few words inside the sentence.

Lesson for the tutorial: the server never changed. The whole user experience lives in three plain-text prompt files.

**13:20 Custom domain.** The council now answers at `https://advisorycouncil.ahmads.build/mcp`. One line in `wrangler.toml` did it; Cloudflare created the DNS record and certificate on its own because `ahmads.build` is already on the account. All checks pass at the new address. The `workers.dev` address still works too.

**13:30 Going public.** Ahmad decided the repo should be public, because the point is to build in public.
- Removed from the Marcus doc: the story of the job ending, the income goal, and the "before launch" reminder. The original Claude doc is unchanged, so a fresh export would bring them back.
- The local history was squashed into one snapshot before the first upload, so the removed text is not in the public history.
- McLuhan's quotations stay as they are (Ahmad's call).

**13:30 A web page at the root address.** `advisorycouncil.ahmads.build` now shows a page in the same design as `chiefofstaff.ahmads.build`: who is on the council, the connector address with a copy button, and how to ask. It lives in `public/index.html` and reuses the shared Build 52 styles from `ahmads.build`. The Worker serves it as a static file; `/mcp` still goes to the council.

**13:40 Avatar.** Added the council's avatar, a pixel-art owl in blue sunglasses, to the page. The original is 2048 pixels wide; the copy in `public/` is 480 so the page stays light.

**13:45 Listed on ahmads.build.** The council now has a tile on the home page and a card on the agents page, both linking to `advisorycouncil.ahmads.build`. That work is in the website's own repo (`ahmads-build`), not this one. The agents page also gained one line explaining that some agents are connectors with nothing to download.

**13:55 Tutorial, and a leaner install page.** Ahmad's feedback: don't wait a day for the tutorial, and get people to Step 1 faster.
- The install page now opens straight on Step 1. "Who is on the council" is gone, "What you'll need" is a card in the side column, and "What I learned" moved out (those points belong in the weekly writing).
- A tutorial now lives at `advisorycouncil.ahmads.build/tutorial/` (`public/tutorial/index.html`): choose advisors, write one document each, start from this repo in Claude Code, test, deploy, connect, tune the prompts. Its steps sit behind the same email box as the Chief of Staff tutorial.
- From now on a launch does all of this in one pass: subdomain, agents page, Build with me page, home page, and a doc for Friday's writing. The steps are written down in the "Build 52 launch process" doc.

**14:00 One mapping for every agent.** Ahmad spotted that the two agents did not match. The rule is now the same for all: `<name>.ahmads.build` is the install page, and `<name>.ahmads.build/tutorial/` is the tutorial.
- This install page lost its "Why I built this" card. That and "What I learned" live only on the tutorial.
- The Chief of Staff was moved to match: its install page went from `ahmads.build/agents/chief-of-staff/` to `chiefofstaff.ahmads.build`, and its tutorial to `chiefofstaff.ahmads.build/tutorial/`. The old install address redirects.
- The phone menu on all sites now shows About and LinkedIn at the same size, centred, with no outline.
- The two install pages now share one layout: numbered steps in the main column, "What you'll need" as a side card, then "How it works" and a link to the code. The Chief of Staff page was rebuilt on this page's template.

**What broke and how it was fixed**
- "partnership" did not match the "partner" rows in the Socrates sheet. Added a rule that trims "-ship" before matching.

**Known rough edges**
- Keyword matching is literal. "Should I build my own team, join one, or go solo?" finds only one Socrates row, because the sample sheet has 50 rows and few share its words.
- The rate limit counts per caller address. Claude reaches the server from shared Anthropic addresses, so the limit is set to 300 a minute rather than a small per-person number.
