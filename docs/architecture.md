# Architecture

Mohar is a pipeline, not a chatbot. Unstructured input becomes typed JSON; typed JSON drives deterministic logic; logic produces a concrete artifact and actions.

## The golden split: AI vs. deterministic code

The single principle that keeps the system reliable, testable, and explainable:

| Given to the model (ambiguous / unstructured) | Kept in code (computable) |
|---|---|
| Read a CV into structured fields | Fetch GitHub repos via the API |
| Judge whether code backs a claimed skill | Compare two skill sets; compute the gap |
| Collapse messy posting text into a taxonomy | Readiness arithmetic; ranking; filtering |
| Draft a personalized action plan | Store records; schedule; render; route |

If an answer is a computation over already-structured data, it is code — deterministic, unit-testable, free to run. If it requires reading meaning out of unstructured input, it is the model's job.

## Pipeline stages

1. **CV extraction `[AI]`** → `ClaimedProfile`. The model turns an unstructured résumé into claimed skills, roles, projects, and an inferred target track.
2. **Evidence fetch `[CODE]`** → `EvidenceBundle`. Deterministic calls to the GitHub public API (languages, file manifest, dependency manifests, commit recency, README), or static parsing of an uploaded `.zip`.
3. **Skill verification `[AI]`** → `VerificationResult`. For each claim, the model reasons over the evidence and emits `{status, confidence, evidence[]}`, plus discovered skills absent from the CV. Confidence `< 0.6` is forced to `needs_review` by code.
4. **Skill graph `[CODE]` (v1)** → `SkillGraphNode[]`. A curated, dated demand snapshot (`data/skill-graph/`) is loaded deterministically (`workflows/skillGraph.ts`). The demand weights are hand-set for v1; AI normalization of raw job postings into the taxonomy is a planned v2 path, not part of the current code.
5. **Gap analysis + readiness `[CODE]`** → `ReadinessScore`. Pure arithmetic over structured data; see the formula in the README.
6. **Action plan `[AI]`** → `ActionItem[]`. Grounded in the computed gaps, the model writes concrete, evidence-producing next steps.
7. **Matching `[CODE + embeddings]`** → `MatchedOpportunity[]`. BGE-M3 embeddings + pgvector cosine similarity between the verified profile and postings, on local and remote axes.

## Structured-output discipline

Every AI call is schema-enforced (Ollama structured outputs / guided decoding) and validated on receipt against the `packages/shared` contracts. Invalid output is rejected and retried; unvalidated model text never touches the database or triggers an action. Each verdict carries a `confidence`, and a threshold governs the safe fallback.

## Data strategy (reproducibility)

- **Evidence:** GitHub public API (use a token for rate limits). A no-GitHub upload path keeps the tool inclusive.
- **Nepal skill graph:** a curated, dated snapshot committed under `data/skill-graph/` — not live scraping, which would be unreproducible for anyone cloning the repo and legally fragile.
- **Remote axis:** free job APIs (e.g. Remotive, RemoteOK) queried per-user for matching; their listings are not re-published or aggregated into the committed graph.

## Why self-hosted

Open-weight models on Ollama mean CVs, code, and identity never leave the machine — a real data-sovereignty property, not a marketing line, and the backbone of the privacy/safety story.
