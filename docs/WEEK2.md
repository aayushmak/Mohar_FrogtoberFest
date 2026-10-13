# Week 2 — Vertical slice, end to end

Week 1 proved the engine: can an open-weight model tell a backed skill from a padded one. Week 2 turns a verdict into the **hero artifact** — a full `VerifiedSkillProfile`: a demand-weighted **readiness score**, your **strengths**, your **top gaps**, and an **AI action plan** to close them. Still headless (CLI + JSON API, no web UI — that's Week 3).

```
CV / skills ─[AI]→ claims
                     │
GitHub ─[CODE]→ evidence
                     │
            [AI] verify  →  verdicts (verified / partial / unverified / needs_review)
                     │
    [CODE] scoreReadiness vs Nepal demand snapshot  →  readiness score + gaps
                     │
            [AI] generatePlan (grounded in gaps)  →  action plan
                     │
    [CODE] buildProfile  →  VerifiedSkillProfile JSON
```

## What Week 2 adds (all built)

- `packages/workflows/src/skillGraph.ts` — loads the dated **Nepal skill-demand snapshot**.
- `packages/workflows/src/readiness.ts` — `scoreReadiness` + `analyzeGaps`, **pure arithmetic, unit-tested**.
- `packages/ai/src/generatePlan.ts` — the **action plan**, grounded in the computed gaps.
- `packages/workflows/src/buildProfile.ts` — the **orchestrator** that assembles the profile (no LLM calls of its own).
- `apps/cli/src/profile.ts` — `npm run profile`, the Week 2 demo surface.
- `apps/api/src/server.ts` — `POST /verify`, the same profile over HTTP (dependency-free `node:http`).
- `data/skill-graph/nepal-demand.v1.json` — the demand snapshot (hand-curated v1 — see honesty note below).

---

## Full setup (covers Week 1 **and** Week 2)

Nothing new to install beyond Week 1 — same one model.

```bash
# 0. One-time: Ollama + the reasoning model
#    Install the Ollama app from ollama.com, then:
ollama pull qwen2.5:7b-instruct
#    (bge-m3 is only needed in Week 3 for matching — skip it for now.)

# 1. Install + typecheck
cd mohar
cp .env.example .env          # optional: add GITHUB_TOKEN to raise the API rate limit
npm install
npm run typecheck             # expect no errors

# 2. The deterministic scorer — no model, no network needed
npm test                      # runs packages/workflows/src/readiness.test.ts
```

You do **not** need Postgres for Week 2. (It's wired in docker-compose for Week 3's pgvector matching.)

---

## Run it

### The deterministic unit tests (fast, offline)

```bash
npm test
```

Pins the readiness arithmetic a judge could check by hand (`verified`=1, `partial`=0.5, else 0; `score = Σ(weight·factor)/Σ(weight)·100`), plus alias matching and that `needs_review` earns nothing.

### Week 1 — raw verdicts (the gate)

```bash
npm run verify -- --github <your-username> --skills "React,TypeScript,Node,Express,PostgreSQL,Docker"
npm run eval                  # accuracy vs eval/datasets/self.labeled.json
```

### Week 2 — the full profile

```bash
# From a skill list, scored for a track:
npm run profile -- --github <your-username> --skills "React,TypeScript,Node,Express,PostgreSQL,Docker" --track fullstack

# Or from a CV (skills + track are extracted by AI):
npm run profile -- --github <your-username> --cv ./my-cv.txt
```

You'll see a readiness score, your verified / discovered / unverified skills, your top gaps, and an action plan. Full JSON lands in `./out/profile-<user>.json`.

### Week 2 — the API

```bash
npm run api
# in another terminal:
curl -s localhost:3000/verify -X POST -H 'content-type: application/json' \
  -d '{"github":"<your-username>","skills":"React,Node,PostgreSQL","track":"fullstack"}'
```

Request body: `github` (required), then either `skills` (comma-separated) or `cvText` (raw CV text), and optional `track`. Returns the full `VerifiedSkillProfile` JSON.

---

## Reading the profile

- **Readiness `0–100`** — how much of the track's *in-demand* skills you've got, weighted by demand. Directional, not a grade (see the snapshot note).
- **Verified** — claimed and backed by real code.
- **Discovered** — proven in your code but missing from your CV. (A quiet selling point: Mohar finds skills you undersold.)
- **Unverified claims** — on the CV, no evidence found. Honest, and the thing to go fix.
- **Gaps** — in-demand skills you're missing or only partial on, most in-demand first.
- **Action plan** — one concrete, buildable thing per gap, chosen to produce evidence Mohar could later verify.

---

## The skill-demand snapshot — honesty note

The readiness score is weighted by `data/skill-graph/nepal-demand.v1.json`. Those weights are **hand-set first estimates** informed by an informal reading of Nepal-facing listings in Oct 2026 — **not a statistical survey**. They exist so the score is computable and demoable. Treat the number as *directional*. Before any public or quantitative claim, replace the weights with counts from a real, dated posting sample and bump the snapshot. This is deliberate — the score is transparent about what it is, and the snapshot is versioned so anyone can inspect and challenge it.

---

## Done when (Week 2 definition of done)

One input (CV **or** skills + a GitHub user) produces a complete `VerifiedSkillProfile` JSON — verified / partial / unverified skills with evidence, discovered skills, a readiness number, and an action plan — through **both** the CLI (`npm run profile`) and the API (`POST /verify`). ✔ built.

## The AI-vs-code split (the judging story)

- **AI** (open-weight Qwen2.5 via Ollama): `extractCv`, `verifySkills`, `generatePlan` — only where meaning must be read from unstructured input. Every call is schema-validated.
- **Code** (deterministic, no LLM): GitHub fetch, `scoreReadiness`, `analyzeGaps`, the confidence floor, profile assembly, routing.

Every AI consumption point maps to a real file/function in `docs/ai-usage.md`. The **remove-AI test** still holds: strip `verifySkills` and only an unverified CV remains — no verdicts, no score, no plan.

## Not in Week 2 (that's Week 3)

- Embeddings + opportunity matching (BGE-M3 + pgvector) — `VerifiedSkillProfile.matches` is `[]` for now.
- The web UI. Week 2 is intentionally headless; the profile JSON is the contract the UI will render.
