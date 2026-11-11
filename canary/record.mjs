#!/usr/bin/env node
// Records one night of the drift canary in the canary-data branch: the new
// baseline, the day's report when anything changed, the feed's index, and
// feed.json, which mcpkeel.app/drift reads.
//
//   node canary/record.mjs <artifact-dir> <data-dir> <YYYY-MM-DD>
//
// The artifact comes from the job that ran the servers, which were third-party
// code at their latest version, so it is read as untrusted data: parsed and
// copied, never executed. The index is built from severities checked against
// a fixed list and names cut down to plain characters. The day's report is
// mcpkeel's Markdown, which never emits a server's text as Markdown.
import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const [artifact, data, date] = process.argv.slice(2);
if (!artifact || !data || !/^\d{4}-\d{2}-\d{2}$/.test(date ?? "")) {
  console.error("usage: record.mjs <artifact-dir> <data-dir> <YYYY-MM-DD>");
  process.exit(2);
}

const read = (path) => (existsSync(path) ? JSON.parse(readFileSync(path, "utf8")) : undefined);
const verify = read(join(artifact, "verify.json"));
const diff = read(join(artifact, "diff.json"));
const SEVERITIES = ["critical", "high", "medium", "low"];
const plain = (value) => String(value ?? "").replace(/[^A-Za-z0-9_.@/-]/g, "_").slice(0, 80);
const changes = (Array.isArray(diff?.changes) ? diff.changes : []).filter((change) => SEVERITIES.includes(change?.severity));

mkdirSync(join(data, "history"), { recursive: true });
if (existsSync(join(artifact, "mcp.lock"))) copyFileSync(join(artifact, "mcp.lock"), join(data, "mcp.lock"));

if (changes.length) {
  copyFileSync(join(artifact, "day.md"), join(data, "history", `${date}.md`));
  writeFileSync(join(data, "history", `${date}.json`), `${JSON.stringify(dayRecord(date, changes), null, 2)}\n`);
}

// The first night has no comparison, only a baseline: its servers come from the lockfile.
const baseline = read(join(artifact, "mcp.lock"));
const checked = Array.isArray(verify?.servers)
  ? verify.servers
  : Object.entries(baseline?.servers ?? {}).map(([name, entry]) => ({ name, status: "pinned", serverInfo: entry?.serverInfo }));
const status = {
  lastChecked: date,
  servers: checked.map((server) => ({
    name: plain(server.name),
    status: plain(server.status),
    version: server.serverInfo?.version ? plain(server.serverInfo.version) : null,
  })),
  notChecked: (Array.isArray(verify?.incomplete) ? verify.incomplete : []).filter((step) => step.server).map((step) => ({ server: plain(step.server), step: plain(step.step) })),
  firstRun: !verify,
};
writeFileSync(join(data, "status.json"), `${JSON.stringify(status, null, 2)}\n`);
writeFileSync(join(data, "README.md"), feed(data, status));
writeFileSync(join(data, "feed.json"), `${JSON.stringify(feedJson(data, status, date), null, 2)}\n`);
console.log(`${date}: ${changes.length} change(s) recorded, ${status.servers.length} server(s) checked.`);

/** The counts behind a day, without the changed text, which stays in the day's Markdown report. */
function dayRecord(day, list) {
  const bySeverity = { critical: 0, high: 0, medium: 0, low: 0 };
  for (const change of list) bySeverity[change.severity]++;
  return {
    date: day,
    changes: list.length,
    bySeverity,
    servers: [...new Set(list.map((change) => plain(change.server)))].sort(),
    findings: list.map((change) => ({
      server: plain(change.server),
      severity: change.severity,
      rule: plain(change.rule),
      owasp: change.owasp ? plain(change.owasp) : null,
      kind: plain(change.kind),
    })),
  };
}

function recordedDays(dir) {
  return readdirSync(join(dir, "history"))
    .filter((name) => name.endsWith(".json"))
    .map((name) => JSON.parse(readFileSync(join(dir, "history", name), "utf8")))
    .sort((a, b) => (a.date < b.date ? 1 : -1));
}

/**
 * Every night the canary ran, oldest first. The first night only pins a
 * baseline; each later night is compared with the one before. Kept in
 * feed.json, and seeded once from this branch's commits, one per night.
 */
function nightsChecked(dir, today) {
  const previous = read(join(dir, "feed.json"));
  let nights = Array.isArray(previous?.nights) ? previous.nights.filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d)) : undefined;
  if (!nights) {
    let log = "";
    try {
      log = execFileSync("git", ["-C", dir, "log", "--format=%s"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
    } catch {
      // A new branch has no commits yet.
    }
    nights = [...log.matchAll(/^Canary (\d{4}-\d{2}-\d{2})$/gm)].map((m) => m[1]);
  }
  return [...new Set([...nights, today])].sort();
}

/** What mcpkeel.app/drift shows: counts and names only, no server text. */
function feedJson(dir, current, today) {
  const nights = nightsChecked(dir, today);
  return {
    lastChecked: current.lastChecked,
    nights,
    servers: current.servers,
    notChecked: current.notChecked,
    days: recordedDays(dir).map(({ date: day, changes: count, bySeverity, servers }) => ({ date: day, changes: count, bySeverity, servers })),
  };
}

function feed(dir, current) {
  const days = recordedDays(dir);
  const grade = (counts) =>
    Object.entries(counts)
      .filter(([, n]) => n > 0)
      .map(([level, n]) => `${n} ${level}`)
      .join(", ");
  const lines = [
    "# MCP drift feed",
    "",
    "Every night, [mcpkeel](https://github.com/mcpkeel/mcpkeel) starts a set of popular public MCP servers the way most configs do, without a pinned version, and compares what they tell an agent with the night before. This branch keeps what it found.",
    "",
    `Last checked: **${current.lastChecked}**, ${current.servers.length} server${current.servers.length === 1 ? "" : "s"}.${current.notChecked.length ? ` Not checked: ${current.notChecked.map((s) => `\`${s.server}\``).join(", ")}.` : ""}`,
    "",
    "| Date | Changes | Servers |",
    "| --- | --- | --- |",
    ...days.map((day) => `| [${day.date}](history/${day.date}.md) | ${day.changes} (${grade(day.bySeverity)}) | ${day.servers.map((s) => `\`${s}\``).join(", ")} |`),
    "",
  ];
  if (!days.length) lines.splice(lines.length - 1, 0, "| | No changes recorded yet. | |");
  lines.push("The servers and how they are started are in [`canary/.mcp.json`](https://github.com/mcpkeel/mcpkeel/blob/main/canary/.mcp.json). `mcp.lock` here is the latest baseline.", "");
  return lines.join("\n");
}
