#!/usr/bin/env node
// Builds eval/data/canary-benign.json: the changes the nightly canary saw on
// real public MCP servers, as mcpkeel reported them, for the --explain eval.
//
//   npm run build && node eval/build-canary-set.mjs <canary-data checkout>
//
// It walks the canary-data branch one commit per night, diffs each night's
// mcp.lock against the night before with mcpkeel's own diffLockfiles, keeps the
// changes a reviewer is shown, and drops repeats. The label is an assumption,
// stated in the file: these are ordinary releases of well-known servers, so
// none of them is adversarial. Whether each is cosmetic or functional is not
// labelled.
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { diffLockfiles } from "../dist/diff.js";
import { reviewable } from "../dist/review.js";

const here = dirname(fileURLToPath(import.meta.url));
const data = process.argv[2];
if (!data) {
  console.error("usage: build-canary-set.mjs <canary-data checkout>");
  process.exit(2);
}
const git = (...args) => execFileSync("git", ["-C", data, ...args], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });

const commits = git("log", "--reverse", "--format=%H %s")
  .trim()
  .split("\n")
  .map((line) => /^([0-9a-f]{40}) Canary (\d{4}-\d{2}-\d{2})$/.exec(line))
  .filter(Boolean)
  .map(([, sha, date]) => ({ sha, date }));

const seen = new Set();
const changes = [];
let previous;
for (const { sha, date } of commits) {
  let lock;
  try {
    lock = JSON.parse(git("show", `${sha}:mcp.lock`));
  } catch {
    continue;
  }
  if (previous) {
    for (const change of reviewable(diffLockfiles(previous, lock))) {
      const key = JSON.stringify([change.server, change.kind, change.subject, change.before, change.after, change.context]);
      if (seen.has(key)) continue;
      seen.add(key);
      const { server, kind, subject, message, severity, before, after, context, flags } = change;
      changes.push({ night: date, server, kind, subject, message, severity, before, after, context, flags });
    }
  }
  previous = lock;
}

const out = {
  what: "Changes the nightly canary saw on popular public MCP servers, as mcpkeel verify reported them, without repeats. Assumed benign: ordinary releases of well-known servers. Not labelled cosmetic or functional.",
  source: { branch: "canary-data", from: commits[0]?.date, to: commits.at(-1)?.date, nights: commits.length, lastCommit: commits.at(-1)?.sha },
  changes,
};
mkdirSync(join(here, "data"), { recursive: true });
writeFileSync(join(here, "data", "canary-benign.json"), `${JSON.stringify(out, null, 2)}\n`);
const byKind = {};
for (const change of changes) byKind[change.kind] = (byKind[change.kind] ?? 0) + 1;
console.log(`${changes.length} changes from ${commits.length} nights (${out.source.from} to ${out.source.to})`, byKind);
