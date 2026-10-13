# Mohar — मोहर

**Prove your skills. Don't just claim them.**

Mohar is an open-source, fully self-hosted AI tool that verifies a jobseeker's *claimed* skills against the *real evidence* in their code, turns the proven skills into a portable Verified Skill Profile, scores how ready they are against actual market demand, and matches them to local and remote opportunities.

A *mohar* (मोहर) is an official seal — a mark of authenticity. That is what this gives your skills.

> Built for [Frogtoberfest 2026](https://leapfrog.com.np) (Leapfrog Technology) — an open-source, AI-focused challenge. Entire pipeline runs on open-weight, self-hostable models. No proprietary AI APIs anywhere.

---

## The problem

In Nepal, hiring runs on networks instead of merit — because a CV can't be trusted. Anyone can type "expert in React," and employers know it, so skilled first-time jobseekers, rural candidates, and self-taught developers get filtered out before anyone looks at what they have actually built. The same wall locks youth out of global freelance platforms, where a newcomer has no verifiable portfolio.

The cost is severe: Nepal's youth unemployment sits near **20%** — the highest in South Asia — and roughly **1,500 young people leave the country every day** for foreign work. The gap isn't skill. It's trusted *proof* of skill.

Existing tools don't close this gap. Résumé builders and ATS scanners (locally and globally) analyze the CV *as submitted* — they automate the reading of an unreliable document. Mohar attacks the unreliability itself.

## What Mohar does

1. A jobseeker links their **GitHub** username, or uploads project files (the no-GitHub path, for inclusion).
2. An open-weight model reads the actual code and **judges every claimed skill** → `verified | partial | unverified`, each with a confidence score and a pointer to the evidence.
3. It also surfaces **discovered skills** — things clearly present in the code that the CV never mentioned.
4. Deterministic code computes a **readiness score** against a demand-weighted Nepal skill graph, runs **gap analysis**, and the model drafts a **"build-this-to-prove-it" action plan**.
5. Open embeddings rank **matched opportunities** on two axes — local Nepal jobs and remote/global work.

The output is a shareable **Verified Skill Profile** — proof an employer or client can trust, earned on merit.

## Why this needs AI (and why rules can't do it)

The hard step — *does this person's code actually back up the skill they claim?* — is unstructured judgment. The input is messy, real-world code and prose; no `if/else` can read a repository and decide whether it demonstrates genuine React proficiency or a copied tutorial. That reasoning is the model's job.

Everything *around* it is deterministic code, on purpose: fetching repos, computing the score, comparing skill sets, ranking matches, scheduling. **Remove the AI and all that remains is an unverified CV — the broken status quo.** That is the test this project is built to pass.

## Architecture

```
INPUT: CV (PDF/DOCX) + GitHub username (or uploaded project .zip)
   │
1  [AI]   Extract claimed skills/roles/projects from the CV            → ClaimedProfile
   │
2  [CODE] Fetch evidence: GitHub public API (langs, files, deps, recency)
   │
3  [AI]   Judge each claim against the code → verdict + confidence + evidence,
   │       plus "discovered" skills missing from the CV                 → VerificationResult
   │
4  [AI]   Normalize messy job postings into one skill taxonomy          → SkillGraphNode[]
   │       (built offline from a curated, dated snapshot)
   │
5  [CODE] Gap analysis + readiness score (deterministic, unit-tested)   → ReadinessScore
   │
6  [AI]   Draft a prioritized, evidence-focused action plan             → ActionItem[]
   │
7  [CODE] Semantic matching (BGE-M3 embeddings + pgvector)              → MatchedOpportunity[]
   │
OUTPUT: VerifiedSkillProfile  (score + verified strengths + honest gaps + plan + matches)
```

See [`docs/architecture.md`](docs/architecture.md) for detail and [`docs/ai-usage.md`](docs/ai-usage.md) for the exact AI-consumption points.

## Open-weight models

| Job | Model | Served by |
|---|---|---|
| CV extraction, skill verification, plan generation | **Qwen2.5 7B-Instruct** (or Llama 3.1 8B) | Ollama |
| Embeddings for matching | **BGE-M3** | Ollama |

Pick the smallest model that passes the eval set. No OpenAI / Anthropic / Gemini / Azure — including for embeddings. Self-hosting is also the privacy story: CVs and code never leave the machine.

## AI usage disclosure (short form)

| AI output | Produced by | Consumed by | Effect |
|---|---|---|---|
| `ClaimedProfile` | `ai/extractCv()` | `workflows/runPipeline()` | seeds the skills to verify |
| `VerificationResult` | `ai/verifySkills()` | `workflows/buildProfile()` | sets each skill's verified status + confidence |
| `SkillGraphNode[]` | `ai/normalizePostings()` | `retrieval/loadSkillGraph()` | demand weights for scoring + matching |
| `ActionItem[]` | `ai/generatePlan()` | profile output | the user's next steps |

Full version with file/function references: [`docs/ai-usage.md`](docs/ai-usage.md).

## Tech stack

React + TypeScript + Tailwind · Node + Express + TypeScript · PostgreSQL + pgvector · Ollama (Qwen/Llama + BGE-M3) · GitHub REST API · Docker Compose.

## Repository layout

```
mohar/
├── apps/
│   ├── web/            # React + Tailwind UI
│   └── api/            # Node + Express + TS; wires AI output to code
├── packages/
│   ├── shared/         # TypeScript JSON contracts (the pipeline's spine)
│   ├── ai/             # Open-weight model calls, schema-enforced JSON
│   ├── retrieval/      # BGE-M3 embeddings + pgvector + skill-graph loader
│   └── workflows/      # Deterministic orchestration, gap analysis, scoring
├── eval/               # Labeled test sets + scoring (accuracy, JSON-validity)
├── data/skill-graph/   # Curated, dated Nepal job-posting snapshot
├── docs/
├── docker-compose.yml
└── README.md
```

## Getting started

```bash
# 1. Start local infra (Postgres + pgvector, Ollama)
docker compose up -d postgres ollama

# 2. Pull the open-weight models
docker exec -it mohar-ollama ollama pull qwen2.5:7b-instruct
docker exec -it mohar-ollama ollama pull bge-m3

# 3. Install deps and run (added as the apps land)
npm install
npm run dev:api
npm run dev:web
```

## Readiness score (deterministic)

For the candidate's target track, over the top demanded skills in the graph:

```
score = Σ(demandWeight · factor) / Σ(demandWeight) × 100
factor:  verified = 1.0 · partial = 0.5 · unverified/missing = 0
```

Fully explainable: you can point at exactly which demanded skills are proven, half-proven, or missing. The AI populates the factors (verification); the score itself is arithmetic.

## Evaluation

A small labeled test set lives in [`eval/`](eval/). We track field-level **extraction accuracy**, **verification accuracy** (against hand-labeled repos), and **JSON schema-validity rate** (how often a model call returns valid, parseable output on the first try). Numbers are reported honestly in the demo — including where it fails.

## Limitations

Verification infers *evidence of hands-on use*, never certified mastery — low-confidence verdicts fall back to `needs_review` rather than asserting. Private or non-code work isn't visible, so the no-GitHub upload path matters. The Nepal skill graph is a dated snapshot, not live market data.

## Future work

Employer-side merit shortlist (rank candidates by verified evidence); controlled/pseudonymous profile sharing; Nepali-language UI; broader evidence sources beyond GitHub.

## License

[MIT](LICENSE).
