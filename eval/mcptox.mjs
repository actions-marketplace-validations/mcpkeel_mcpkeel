#!/usr/bin/env node
// Measures mcpkeel's built-in checks on the MCPTox benchmark: how many of its
// poisoned tool descriptions they flag, and how many of the real tools of the
// same 45 servers they flag by mistake.
//
// The benchmark's data is downloaded at a pinned commit and checked against a
// known digest, into eval/.cache. It is not part of this repository; only the
// numbers this script derives are.
//
//   npm run build && node eval/mcptox.mjs [--write]
//
// --write saves the summary to eval/results/mcptox.json.
// --check compares this run with that file and exits 1 if mcpkeel now reports
// fewer poisoned tools, or flags more real ones. CI runs it on every change.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { diffLockfiles, scanServer } from "../dist/diff.js";
import { COMMIT, FILES, REPOSITORY, loadMcptox, lockOf } from "./lib/mcptox-data.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");

/** The ids of the built-in checks that fire on one tool, the way `mcpkeel init` reads a server. */
function checks(entry) {
  const hits = scanServer({ transport: "stdio", source: {}, integrity: "", tools: { t: entry } });
  return [...new Set(hits.flatMap((hit) => hit.flags.map((flag) => flag.id)))].sort();
}

const pct = (part, whole) => (whole ? Math.round((1000 * part) / whole) / 10 : 0);

function tally(rows, key) {
  const groups = new Map();
  for (const row of rows) {
    const group = groups.get(row[key]) ?? { total: 0, flagged: 0 };
    group.total++;
    if (row.checks.length) group.flagged++;
    groups.set(row[key], group);
  }
  return Object.fromEntries([...groups].sort(([a], [b]) => (a < b ? -1 : 1)).map(([name, g]) => [name, { ...g, rate: pct(g.flagged, g.total) }]));
}

const { attacks: poisonedTools, cleanTools } = await loadMcptox();

/**
 * The way mcpkeel meets a poisoned tool in use: the server was pinned with its
 * real tools, and the poisoned one appears later. Returns the most severe
 * change `verify` reports for it, or undefined if it reports none.
 */
function drift(serverName, toolName, entry) {
  const pinned = Object.fromEntries((cleanTools.get(serverName) ?? []).map(({ name, entry: e }) => [name, e]));
  const changes = diffLockfiles(lockOf(pinned), lockOf({ ...pinned, [toolName]: entry }));
  return ["critical", "high", "medium", "low"].find((level) => changes.some((change) => change.severity === level));
}

const attacks = poisonedTools.map((tool) => ({
  server: tool.server,
  paradigm: tool.paradigm,
  risk: tool.risk,
  checks: checks(tool.entry),
  drift: drift(tool.server, tool.tool, tool.entry),
}));
const benign = [...cleanTools].flatMap(([server, tools]) => tools.map(({ name, entry }) => ({ server, tool: name, checks: checks(entry) })));

const flaggedAttacks = attacks.filter((row) => row.checks.length).length;
const reportedHigh = attacks.filter((row) => row.drift === "critical" || row.drift === "high").length;
const reportedCritical = attacks.filter((row) => row.drift === "critical").length;
const flaggedBenign = benign.filter((row) => row.checks.length);
const byCheck = {};
for (const row of attacks) for (const id of row.checks) byCheck[id] = (byCheck[id] ?? 0) + 1;

const version = JSON.parse(readFileSync(join(root, "package.json"), "utf8")).version;
const summary = {
  benchmark: { name: "MCPTox", repository: `https://github.com/${REPOSITORY}`, commit: COMMIT, files: FILES },
  mcpkeel: version,
  what: "Built-in checks only, no model review. `flagged`: a check fires on the tool as `mcpkeel init` reads it. `drift`: the server is pinned with its real tools and the poisoned tool then appears, as `mcpkeel verify` sees it.",
  attacks: {
    total: attacks.length,
    drift: { reportedAtHighOrAbove: reportedHigh, critical: reportedCritical, rate: pct(reportedHigh, attacks.length) },
    flagged: flaggedAttacks, rate: pct(flaggedAttacks, attacks.length), byTemplate: tally(attacks, "paradigm"), byRisk: tally(attacks, "risk"), byCheck },
  benign: {
    total: benign.length,
    flagged: flaggedBenign.length,
    rate: pct(flaggedBenign.length, benign.length),
    // Names only: the benchmark's text stays in the benchmark.
    flaggedTools: flaggedBenign.map((row) => ({ server: row.server, tool: row.tool, checks: row.checks })),
  },
};

const line = (label, part, whole) => `${label.padEnd(28)} ${String(part).padStart(4)} / ${String(whole).padEnd(4)} ${pct(part, whole).toFixed(1).padStart(5)}%`;
console.log(`MCPTox at ${COMMIT.slice(0, 7)}, mcpkeel ${version}, built-in checks only\n`);
console.log(line("Poisoned tools as drift ≥ high", reportedHigh, attacks.length));
console.log(line("  of which critical", reportedCritical, attacks.length));
console.log(line("Poisoned tools flagged", flaggedAttacks, attacks.length));
for (const [name, g] of Object.entries(summary.attacks.byTemplate)) console.log(line(`  ${name}`, g.flagged, g.total));
console.log(line("Real tools flagged", flaggedBenign.length, benign.length));
console.log("\nBy risk category:");
for (const [name, g] of Object.entries(summary.attacks.byRisk)) console.log(line(`  ${name}`, g.flagged, g.total));
console.log("\nChecks that fired on poisoned tools:");
for (const [id, count] of Object.entries(byCheck).sort((a, b) => b[1] - a[1])) console.log(`  ${id.padEnd(26)} ${count}`);
if (flaggedBenign.length) {
  console.log("\nReal tools flagged:");
  for (const row of flaggedBenign) console.log(`  ${row.server} / ${row.tool}: ${row.checks.join(", ")}`);
}

if (process.argv.includes("--check")) {
  const baseline = JSON.parse(readFileSync(join(here, "results", "mcptox.json"), "utf8"));
  const regressions = [];
  if (summary.attacks.drift.reportedAtHighOrAbove < baseline.attacks.drift.reportedAtHighOrAbove) regressions.push("fewer poisoned tools reported as drift at high or above");
  if (summary.attacks.drift.critical < baseline.attacks.drift.critical) regressions.push("fewer poisoned tools graded critical");
  if (summary.attacks.flagged < baseline.attacks.flagged) regressions.push("fewer poisoned tools flagged by the built-in checks");
  if (summary.benign.flagged > baseline.benign.flagged) regressions.push("more real tools flagged by mistake");
  if (regressions.length) {
    console.error(`\nRegression against eval/results/mcptox.json: ${regressions.join("; ")}.`);
    process.exit(1);
  }
  const improved = summary.attacks.flagged > baseline.attacks.flagged || summary.benign.flagged < baseline.benign.flagged;
  console.log(`\nNo regression against eval/results/mcptox.json.${improved ? " This run is better: update the baseline with --write." : ""}`);
}

if (process.argv.includes("--write")) {
  mkdirSync(join(here, "results"), { recursive: true });
  writeFileSync(join(here, "results", "mcptox.json"), `${JSON.stringify(summary, null, 2)}\n`);
  console.log("\nWrote eval/results/mcptox.json");
}
