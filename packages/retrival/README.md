# @mohar/retrieval

Embeddings + matching + the skill-graph loader.

- `embed(text)` → vector (BGE-M3 via Ollama)
- `loadSkillGraph()` → `SkillGraphNode[]` from the curated snapshot in `data/skill-graph/`
- `matchOpportunities(profile)` → `MatchedOpportunity[]` via pgvector cosine similarity

No LLM reasoning here — just embeddings and deterministic vector search.
