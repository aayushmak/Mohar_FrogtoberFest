# @mohar/api

Node + Express + TypeScript. Exposes the pipeline over HTTP and wires AI output
to deterministic code. Validates every AI response against `@mohar/shared` before
using it.

Planned routes:
- `POST /verify` — body: CV + GitHub handle (or upload) → `VerifiedSkillProfile`
- `GET /health`
