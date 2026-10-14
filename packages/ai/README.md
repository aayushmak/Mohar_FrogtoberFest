# @mohar/ai

Open-weight model calls (via Ollama). Each function returns schema-validated JSON
matching a `@mohar/shared` contract — never raw text.

- `extractCv(cvText)` → `ClaimedProfile`
- `verifySkills(claims, evidence)` → `VerificationResult`  (the core)
- `normalizePostings(rawPostings)` → `SkillGraphNode[]`  (offline)
- `generatePlan(gaps, evidence)` → `ActionItem[]`

Models: Qwen2.5 7B-Instruct (reasoning), BGE-M3 (embeddings). No proprietary APIs.
Structured decoding is enforced; invalid output is rejected and retried.
