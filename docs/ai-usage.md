# AI Usage Disclosure

Frogtoberfest asks exactly where AI output is consumed programmatically. Here it is, down to the function. Every AI call returns schema-validated JSON (see `packages/shared/src/contracts.ts`); application code consumes the typed object. No model output is shown to the user as the end of the story.

## The core test

Remove the AI and only an unverified CV remains — no verdicts, no readiness, no action plan, no evidence-based matches. The verification step *is* the engine.

## Consumption points

### 1. CV extraction — [implemented]
- **AI output:** `ClaimedProfile` — `packages/ai/src/extractCv.ts` → `extractCv(cvText)`
- **Model:** `qwen2.5:7b-instruct` (open-weight, via Ollama)
- **Consumed by:** `apps/cli/src/profile.ts` and `apps/api/src/server.ts`, which pass `claimedSkills` into `buildProfile()`
- **Effect:** defines the set of claims the system will try to prove

### 2. Skill verification — the core — [implemented]
- **AI output:** `VerificationResult` (`SkillVerdict[]`) — `packages/ai/src/verifySkills.ts` → `verifySkills(claims, evidence)`
- **Model:** `qwen2.5:7b-instruct`
- **Consumed by:** `packages/workflows/src/buildProfile.ts`
- **Effect:** each skill's `status` + `confidence` is written onto the Verified Skill Profile; `confidence < CONFIDENCE_FLOOR` is coerced to `needs_review` in code (`verifySkills.ts` → `applyConfidenceFloor`); discovered skills are added to the profile

### 3. Action-plan generation — [implemented]
- **AI output:** `ActionItem[]` — `packages/ai/src/generatePlan.ts` → `generatePlan(gaps, track)`
- **Model:** `qwen2.5:7b-instruct`
- **Consumed by:** `packages/workflows/src/buildProfile.ts` → attached to the profile output
- **Effect:** the concrete, buildable next steps the user sees; **grounded in the deterministic gap list** — code filters the model's output back down to the computed gap skills, so it cannot wander off-list

### 4. Embeddings for matching — [planned, Week 3]
- **AI output:** dense vectors — `packages/retrieval` → `embed(text)`
- **Model:** `bge-m3` (open-weight, via Ollama)
- **Consumed by:** `matchOpportunities()` via pgvector cosine similarity
- **Effect:** ranks the local/remote opportunities on the profile (`VerifiedSkillProfile.matches`, currently `[]`)

> **The skill-demand graph is NOT an AI step in v1.** The demand weights in `data/skill-graph/nepal-demand.v1.json` are **hand-curated** and loaded deterministically by `packages/workflows/src/skillGraph.ts` → `loadSkillGraph()`. AI normalization of raw job postings into the taxonomy is a possible v2 path; it is not in the code today, so it is deliberately not listed as a consumption point.

## What is deterministic (not AI)

Gap analysis, the readiness arithmetic, GitHub fetching, ranking/filtering, storage, and routing are all plain code in `packages/workflows` and `packages/retrieval`. This split is deliberate and is itself part of the engineering story.
