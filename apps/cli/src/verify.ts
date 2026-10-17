/**
 * Mohar — Week 1 CLI.
 *
 * Runs the core slice end to end:
 *   CV (or skill list)  ->  [AI] extract  ->  [CODE] fetch GitHub evidence
 *                       ->  [AI] verify    ->  verdict JSON + summary table
 *
 * Usage:
 *   npm run verify -- --github <username> --cv ./my-cv.txt
 *   npm run verify -- --github <username> --skills React,TypeScript,Node,PostgreSQL
 *   npm run verify -- --github <username> --cv ./my-cv.txt --max-repos 15 --out ./out/me.json
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { parseArgs } from "node:util";
import type { ClaimedSkill, SkillVerdict } from "../../../packages/shared/src/contracts";
import { assertModelAvailable } from "../../../packages/ai/src/llm";
import { extractCv } from "../../../packages/ai/src/extractCv";
import { verifySkills } from "../../../packages/ai/src/verifySkills";
import { fetchGithubEvidence } from "../../../packages/evidence/src/github";

const USAGE = `Mohar verify — prove claimed skills against real GitHub code.

Usage:
  npm run verify -- --github <username> (--cv <file> | --skills a,b,c) [options]

Required:
  --github <username>   GitHub user whose public repos are the evidence
  one of:
    --cv <file>         path to a CV/resume text file (skills are extracted by AI)
    --skills <list>     comma-separated claimed skills (skip extraction)

Options:
  --max-repos <n>       how many recent repos to inspect (default 12)
  --out <file>          where to write the full JSON (default ./out/verify-<user>.json)
  -h, --help            show this help
`;

async function main(): Promise<void> {
  const { values } = parseArgs({
    options: {
      github: { type: "string" },
      cv: { type: "string" },
      skills: { type: "string" },
      "max-repos": { type: "string" },
      out: { type: "string" },
      help: { type: "boolean", short: "h" },
    },
  });

  if (values.help || !values.github) {
    console.log(USAGE);
    if (!values.help) process.exitCode = 1;
    return;
  }
  const github = values.github;
  if (!values.cv && !values.skills) {
    console.error("Error: provide --cv <file> or --skills a,b,c\n");
    console.log(USAGE);
    process.exitCode = 1;
    return;
  }

  const t0 = Date.now();

  // Preflight: fail clearly if Ollama/model isn't ready.
  await assertModelAvailable();

  // --- Claims: from CV via AI, or straight from the --skills list ---
  let claims: ClaimedSkill[];
  if (values.cv) {
    const cvText = await readFile(values.cv, "utf8");
    process.stdout.write(`Extracting claims from ${values.cv} ... `);
    const { profile, latencyMs } = await extractCv(cvText);
    claims = profile.claimedSkills;
    console.log(`done (${claims.length} skills, target track: ${profile.targetTrack}, ${latencyMs} ms)`);
  } else {
    claims = values
      .skills!.split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .map((name) => ({ name }));
    console.log(`Using ${claims.length} skills from --skills.`);
  }

  // --- Evidence: deterministic GitHub fetch ---
  const maxRepos = values["max-repos"] ? Number(values["max-repos"]) : undefined;
  process.stdout.write(`Fetching GitHub evidence for @${github} ... `);
  const evidence = await fetchGithubEvidence(github, maxRepos ? { maxRepos } : {});
  console.log(`done (${evidence.repos.length} repos)`);

  // --- Verification: the core AI step ---
  process.stdout.write(`Verifying ${claims.length} skills against code ... `);
  const { result, latencyMs } = await verifySkills(claims, evidence);
  console.log(`done (${latencyMs} ms, model ${result.modelId})`);

  printSummary(result.verdicts);

  const outPath = values.out ?? `./out/verify-${github}.json`;
  const payload = {
    github,
    generatedAt: new Date().toISOString(),
    modelId: result.modelId,
    promptVersion: result.promptVersion,
    reposInspected: evidence.repos.map((r) => r.repo),
    verdicts: result.verdicts,
  };
  await mkdir(dirname(outPath), { recursive: true });
  await writeFile(outPath, JSON.stringify(payload, null, 2), "utf8");

  console.log(`\nFull JSON: ${outPath}`);
  console.log(`Total time: ${((Date.now() - t0) / 1000).toFixed(1)}s`);
}

function printSummary(verdicts: SkillVerdict[]): void {
  const claimed = verdicts.filter((v) => v.claimed);
  const discovered = verdicts.filter((v) => !v.claimed);

  console.log("\n" + row("SKILL", "CLAIMED", "STATUS", "CONF", "TOP EVIDENCE"));
  console.log("-".repeat(92));
  for (const v of [...claimed, ...discovered]) {
    const ev = v.evidence[0]?.signal ?? v.note ?? "";
    console.log(row(v.skill, v.claimed ? "yes" : "no", v.status, v.confidence.toFixed(2), ev));
  }

  const count = (s: string) => verdicts.filter((v) => v.status === s).length;
  console.log("-".repeat(92));
  console.log(
    `verified: ${count("verified")}   partial: ${count("partial")}   ` +
      `unverified: ${count("unverified")}   needs_review: ${count("needs_review")}   ` +
      `discovered: ${discovered.length}`,
  );
}

function row(skill: string, claimed: string, status: string, conf: string, ev: string): string {
  return pad(skill, 24) + pad(claimed, 9) + pad(status, 14) + pad(conf, 6) + ev.slice(0, 39);
}

function pad(s: string, n: number): string {
  return s.length >= n ? s.slice(0, n - 1) + " " : s + " ".repeat(n - s.length);
}

main().catch((err: unknown) => {
  console.error("\n✗ " + (err instanceof Error ? err.message : String(err)));
  process.exitCode = 1;
});
