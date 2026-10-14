# @mohar/shared

TypeScript JSON contracts — the spine of the pipeline. Every AI step must return
an object that validates against a type here, and every service consumes the typed
object rather than free-form model text.

See `src/contracts.ts`.
