# @mohar/workflows

Deterministic orchestration — the glue that consumes AI output and acts on it.
**No LLM calls live here.**

- `buildProfile(input)` → `VerifiedSkillProfile` — orchestrates the full flow end to end (verify → score → plan → assemble). No LLM calls of its own; it calls into `packages/ai`.
- `scoreReadiness(verdicts, graph, track)` → `ReadinessScore` — pure arithmetic (unit-tested in `readiness.test.ts`, run with `npm test`)
- `analyzeGaps(verdicts, graph, track)` → `GapItem[]`
- `skillGraph.ts` → `loadSkillGraph()` / `fromAuthored()` — load the dated demand snapshot into `SkillGraphNode[]`
