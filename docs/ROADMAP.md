# Mohar — Build Roadmap (Frogtoberfest)

A four-week plan to go from scaffold to a submittable, demo-ready project — in the right order, so the risky part is proven before you spend time on anything else.

> **Timeline note:** anchor dates assume a start of **2026-10-09** and a ~1-month window. The exact Frogtoberfest submission deadline is **[VERIFY LIVE]** — confirm it and pull Week 4 back to land a few days *before* it, not on it.

---

## The one rule

**Prove the risky thing first, and stay submittable every single week.**

Everything in Mohar is ordinary engineering except one assumption, and the whole project rests on it:

> *Can an open-weight 7B model, given real code as evidence, reliably tell a backed skill from a padded one?*

If yes, you have a winner. If no, you need to know in **week 1** — while there's still time to adjust the mechanic — not in week 4 with a pretty UI wrapped around a core that doesn't work. So the first week builds no interface at all. It answers that question against your own repositories.

---

## Guiding principles

1. **De-risk before you decorate.** The hardest, most uncertain piece (AI verification quality) goes first. UI, auth, and polish are known quantities — they can wait.
2. **One vertical slice, then widen.** Get a single input flowing end-to-end (one CV + one GitHub user → verdicts → readiness number → printed profile) before adding breadth. A thin thing that works beats a wide thing that half-works.
3. **Always submittable.** At the end of each week there is *something* you could submit. This protects you if a week runs over.
4. **Deterministic by default.** AI only where meaning must be read from unstructured input. Scoring, gaps, ranking, fetching = plain code. This is also a judging story — show the clean split.
5. **Evaluate honestly.** Build the eval harness in week 1 and report real numbers, including failures. Honest 78% beats a hand-wave.

---

## Where things stand (2026-10-09)

- Scaffold complete: monorepo, Docker (Postgres + Ollama), MIT license, README, architecture + AI-usage docs.
- `packages/shared/src/contracts.ts` — the spine. Every AI step must return an object that validates against a type here; every service consumes the typed object, never raw model text.
- **Next physical action:** push to a public GitHub repo (`mohar`) and paste the URL into the Frogtoberfest form. Steps are in the repo chat / README.

Think of `contracts.ts` as the blueprint. Each week below is really "make another contract real."

---

## Week-by-week

### Week 1 (Oct 9–15) — Prove the core · **GO/NO-GO GATE**

The only goal: find out whether verification actually works, on real data.

**Build**
- `ai/extractCv(cvText)` → `ClaimedProfile` — unstructured résumé to structured claims.
- GitHub evidence fetch (plain code) → `EvidenceBundle` — languages, file manifest, dependency manifests, commit recency, README. Use a token for rate limits.
- `ai/verifySkills(claims, evidence)` → `VerificationResult` — the engine. One verdict per skill: `{status, confidence, evidence[]}`.
- A **CLI runner**: `npm run verify -- --github <you> --cv ./my-cv.txt` that prints verdict JSON. No web UI yet.
- The **eval harness**: hand-label ~25–30 skill claims from *your own* repos (pharmacy PWA, portfolio) as the ground truth, and have the harness report accuracy against it.

**Done when**
- You can run one command and get schema-valid verdict JSON for a real GitHub user.
- The eval prints verification accuracy, JSON schema-validity rate, and per-call latency.
- You've eyeballed the verdicts on your own code and they're *sane* (your real React skill reads "verified"; a skill you never used reads "unverified").

**Watch-outs**
- Enforce structured decoding from day one; reject + retry on invalid JSON.
- Apply the confidence floor (`< 0.6` → `needs_review`) in **code**, not in the prompt.
- Keep a `promptVersion` string on every result so you can compare prompt changes against the eval.

> **This is the gate.** If accuracy is weak here, jump to *"If the core is weak"* below and adjust the mechanic before Week 2. Do not proceed to UI on a broken core.

### Week 2 (Oct 16–22) — Vertical slice, end to end

Turn the proven verdict into a full profile — still headless (CLI/JSON is fine).

**Build**
- `scoreReadiness(verdicts, skillGraph, track)` → `ReadinessScore` — pure arithmetic, unit-tested.
- `analyzeGaps(...)` → `GapItem[]` — deterministic.
- A **minimal skill-graph snapshot** in `data/skill-graph/` — even 2–3 tracks with hand-set demand weights is enough to compute a score. Fleshed out later.
- `ai/generatePlan(gaps, evidence)` → `ActionItem[]` — grounded in the computed gaps.
- `workflows/buildProfile(...)` → `VerifiedSkillProfile` — assembles everything.
- Expose `POST /verify` in `apps/api` returning the full profile JSON.

**Done when**
- One input (CV + GitHub) produces a complete `VerifiedSkillProfile` JSON: verified/partial/unverified skills with evidence, discovered skills, a readiness number, and an action plan — through the API.

**Watch-outs**
- Keep `buildProfile` free of LLM calls — it only *orchestrates*. All AI lives in `packages/ai`.
- Write real unit tests for `scoreReadiness` (it's the deterministic claim judges can check).

### Week 3 (Oct 23–29) — Make it demoable

Now, and only now, the interface.

**Build**
- Web UI (`apps/web`): upload (CV + GitHub) → live processing → **Verified Skill Profile** with green/amber/grey badges and clickable evidence links, discovered skills highlighted → readiness dial → top gaps with "build this to prove it" → matched opportunities.
- Embeddings + matching: `retrieval/embed` (BGE-M3) + pgvector cosine similarity → `MatchedOpportunity[]`.
- Flesh out the skill-graph snapshot to something defensible; record its `snapshotDate`.

**Done when**
- A stranger can open the app, run it on real data, and understand the result without you explaining it.
- The evidence links actually point at the files/commits that justified each verdict — this is what makes it feel trustworthy.

**Watch-outs**
- Don't gold-plate. One clean flow beats five half-built screens.
- Make it responsive/low-bandwidth friendly — it's part of the inclusion story for Shequal later.

### Week 4 (Oct 30 – Nov 5) — Polish & submit

Assume judges will clone the repo cold and run it. Make that work.

**Build / finish**
- Harden error paths: private/empty GitHub, no code uploaded, model timeout, bad CV.
- **Clean-clone test:** on a fresh checkout, `docker compose up` → `ollama pull` → `npm install` → it runs. Fix whatever breaks. Finalize `.env.example` and getting-started.
- Finalize `docs/ai-usage.md` so every AI consumption point maps to a real file/function.
- **Record the demo video** — and explicitly show the *remove-AI test*: with verification off, only an unverified CV remains.
- Tag a release; final README pass (screenshots, honest limitations, eval numbers).

**Done when**
- Every box in the checklist below is ticked, and the repo runs from a clean clone.

---

## Submission checklist (Frogtoberfest)

- [ ] Public GitHub repo, MIT-licensed, with clear README
- [ ] AI does real work in the **core** logic (verification), output consumed programmatically
- [ ] **Remove-AI test** holds and is shown in the demo
- [ ] Entire pipeline on **open-weight / self-hostable** models only (Qwen2.5, BGE-M3 via Ollama) — no OpenAI / Anthropic / Gemini / Azure anywhere, including embeddings
- [ ] Explicit **AI-usage disclosure** naming the file/function where AI output is consumed (`docs/ai-usage.md`)
- [ ] Working demo + demo video
- [ ] Runs from a clean clone (documented setup)
- [ ] Solves a real Nepali problem; no "first in Nepal" claims without evidence (use "underserved"); unverified claims marked
- [ ] Eval numbers reported honestly, failures included

---

## Scope discipline — what NOT to build for v1

Cutting these is a decision, not an oversight. Each goes in "Future work," not in October:

- Employer-side shortlisting UI (keep the jobseeker side as the hero)
- User accounts / auth / multi-user — a single-session demo is enough
- Nepali-language UI
- Live scraping of job boards (use the dated snapshot — reproducible and ToS-safe)
- Mobile app
- Payment / monetization

If you catch yourself building any of these before Week 4, stop.

---

## If the core is weak (contingency)

If Week 1 shows the model can't reliably separate backed from padded skills, don't abandon — **adjust the mechanic**, in this order:

1. **Narrow the skill set.** Verifying "React, Express, PostgreSQL" from code is far more tractable than fuzzy claims like "leadership." Restrict v1 to concrete, code-evidenced technical skills.
2. **Fuse deterministic signals.** Blend the AI verdict with hard signals code can read: dependency manifests, presence of tests, file extensions, commit history depth. Let these raise or cap confidence.
3. **Widen the review band.** Raise the `needs_review` threshold so the system is honestly cautious rather than confidently wrong.
4. **Reframe AI as assist, not oracle.** Surface the evidence and let a human make the final call — *but keep AI output in the core consumption path* so the project still satisfies the "AI does real work in core logic" rule.

Knowing which of these you need is exactly why Week 1 comes first.

---

## Daily rhythm

- Commit daily; keep the eval green as you change prompts.
- Bump `promptVersion` whenever you change a prompt, and re-run the eval to see if accuracy moved.
- Write down surprising findings (what the model gets wrong) — that's your demo narrative and your limitations section.

---

## Right now

1. Push the scaffold to a public `mohar` repo; paste the URL into the Frogtoberfest form.
2. Start Week 1: build the verification PoC and test it on your own GitHub. (I'll need your GitHub username to run the first pass with you.)
