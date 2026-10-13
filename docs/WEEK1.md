# Week 1 — Prove the Core

Goal of this week: find out whether an open-weight 7B model can reliably tell a **backed** skill from a **padded** one, using your own real repositories. No UI. Just the engine and honest numbers. This is the go/no-go gate for the whole project.

What you'll run:

```
CV (or skill list) → [AI] extract → [CODE] fetch GitHub evidence → [AI] verify → verdicts + score
```

---

## 1. Prerequisites

- **Node 20+** — check with `node -v`
- **Ollama** running locally, with the reasoning model pulled. Two ways:

  **Native (recommended on Mac)** — install the Ollama app from ollama.com, then:
  ```bash
  ollama pull qwen2.5:7b-instruct
  ```

  **Docker** (uses the repo's `docker-compose.yml`):
  ```bash
  npm run infra:up            # starts the ollama container (and postgres, unused this week)
  docker exec -it mohar-ollama ollama pull qwen2.5:7b-instruct
  ```

> You do **not** need Postgres or the embedding model (`bge-m3`) this week — those arrive in Weeks 2–3.

Optional but strongly recommended: a **GitHub token** so you don't hit the 60-requests/hour anonymous limit. Create a classic token with **no scopes** (public data only) at github.com → Settings → Developer settings → Personal access tokens, then put it in `.env`:

```
GITHUB_TOKEN=ghp_your_token_here
```

---

## 2. Install

```bash
cd mohar
cp .env.example .env     # if you haven't already
npm install
```

Sanity-check the types compile:

```bash
npm run typecheck
```

---

## 3. Run the verifier on yourself

Point it at your GitHub and either a CV file or a quick skill list.

```bash
# From a CV file (AI extracts the claimed skills first):
npm run verify -- --github <your-username> --cv ./my-cv.txt

# Or skip extraction and pass skills directly:
npm run verify -- --github <your-username> --skills "React,TypeScript,Node,Express,PostgreSQL,Docker"
```

You'll get a table like:

```
SKILL                   CLAIMED  STATUS        CONF  TOP EVIDENCE
--------------------------------------------------------------------------------------------
React                   yes      verified      0.93  pharmacy-pwa: 24 .tsx files using hooks
PostgreSQL              yes      verified      0.88  pharmacy-pwa: pg + sequelize in deps
Docker                  yes      unverified    0.20  no Dockerfile found in any repo
Sequelize               no       verified      0.85  pharmacy-pwa: sequelize models present
...
```

The full JSON is written to `./out/verify-<user>.json`.

**What to look at (the honest eye test):** do your *real* skills come back `verified`/`partial`, and do skills you've **never** used come back `unverified`? Try adding a skill you've genuinely never touched to `--skills` — it should be rejected. If the model "verifies" something with no evidence, that's the failure mode to catch now.

---

## 4. Measure it — the eval

Eyeballing isn't enough; label a set and score it.

1. Open `eval/datasets/self.labeled.json`.
2. Replace every `YOUR_GITHUB_USERNAME` with your handle.
3. Edit the rows so each `skill` has an honest `expected` label for your repos — `verified`, `partial`, or `unverified`. Include several skills you did **not** build so `unverified` is well represented. Aim for ~25–30 rows.
4. Run:

```bash
npm run eval
```

You'll get a per-skill table plus:

```
==================== SUMMARY ====================
cases:            28 across 1 user(s)
exact accuracy:   75%    (status matches exactly)
backed accuracy:  89%    (has-evidence vs not)
schema validity:  100%   (3/3 calls valid)
avg latency:      14200 ms per user
=================================================
```

A full run log is saved under `eval/runs/` (git-ignored).

---

## 5. The go/no-go decision

Read your numbers against this rubric:

| Metric | What it means | Target |
|---|---|---|
| **backed accuracy** | gets "has evidence vs not" right — the thing that matters most | **≥ 85%** |
| **exact accuracy** | nails the 4-way status | ≥ 70% promising, ≥ 80% strong |
| **schema validity** | every model call returned valid JSON | ~100% (if not, the schema/prompt needs a look) |
| eye test | your real skills pass, fabricated ones fail | must hold |

**If you're at or above target:** the core works. You have a demo and a green light for Week 2 (deterministic readiness scoring + full profile). Commit your dataset and a run log, and note the numbers for the README.

**If you're below target:** don't panic and don't abandon — adjust the mechanic, in the order laid out in `docs/ROADMAP.md → "If the core is weak"`:
1. narrow to concrete, code-evidenced skills;
2. fuse deterministic signals (deps + tests + file types) with the AI verdict;
3. widen the `needs_review` band (raise `CONFIDENCE_FLOOR` in `.env`);
4. reframe AI as assist (surface evidence, human decides) — while keeping AI in the core path.

Finding this out now, in week one, is exactly why this week comes first.

---

## Where the AI is consumed (for the disclosure)

- `packages/ai/src/extractCv.ts` → `ClaimedProfile`, consumed by the CLI to form the claim list.
- `packages/ai/src/verifySkills.ts` → `VerificationResult`; **code** applies the confidence floor (`applyConfidenceFloor`) and stamps model/prompt provenance. This is the core consumption point.
- All model access is funnelled through `packages/ai/src/llm.ts`, which enforces schema-validated JSON. Nothing else talks to the model.

## Troubleshooting

- *"Cannot reach Ollama"* — the Ollama app/container isn't running, or `OLLAMA_HOST` is wrong.
- *"Model … is not pulled"* — run `ollama pull qwen2.5:7b-instruct`.
- *"GitHub API rate limit reached"* — set `GITHUB_TOKEN` in `.env`.
- *Slow runs* — 7B on CPU can take 10–30s per call; that's fine for Week 1. A smaller model (e.g. `qwen2.5:3b-instruct`) is faster if you want to iterate quickly, then confirm on 7B.
