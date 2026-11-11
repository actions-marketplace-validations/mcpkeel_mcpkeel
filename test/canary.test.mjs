// The canary's recorder, which writes the feed.json mcpkeel.app/drift reads.
// The page's own tests are in site/ (npm test there).
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

test("the recorder writes feed.json, seeding the nights from the data branch's commits", () => {
  const dir = mkdtempSync(join(tmpdir(), "mcpkeel-canary-"));
  const data = join(dir, "data");
  const artifact = join(dir, "artifact");
  mkdirSync(data);
  mkdirSync(artifact);
  const git = (...args) => execFileSync("git", ["-C", data, "-c", "user.name=t", "-c", "user.email=t@t", ...args], { stdio: "ignore" });
  git("init", "-q");
  for (const day of ["2026-11-01", "2026-11-02"]) git("commit", "-q", "--allow-empty", "-m", `Canary ${day}`);

  writeFileSync(join(artifact, "verify.json"), JSON.stringify({ servers: [{ name: "memory", status: "drift", serverInfo: { version: "2.1.1" } }], incomplete: [] }));
  writeFileSync(join(artifact, "diff.json"), JSON.stringify({ changes: [{ server: "memory", severity: "high", rule: "MK112", kind: "tool.description.changed" }] }));
  writeFileSync(join(artifact, "day.md"), "## mcpkeel: 1 change\n");
  execFileSync(process.execPath, [join(root, "canary", "record.mjs"), artifact, data, "2026-11-03"], { stdio: "ignore" });

  const feed = JSON.parse(readFileSync(join(data, "feed.json"), "utf8"));
  assert.deepEqual(feed.nights, ["2026-11-01", "2026-11-02", "2026-11-03"]);
  assert.equal(feed.days.length, 1);
  assert.deepEqual(feed.days[0].bySeverity, { critical: 0, high: 1, medium: 0, low: 0 });

  // The next night appends to feed.json, without reading the commits again.
  execFileSync(process.execPath, [join(root, "canary", "record.mjs"), artifact, data, "2026-11-04"], { stdio: "ignore" });
  assert.equal(JSON.parse(readFileSync(join(data, "feed.json"), "utf8")).nights.length, 4);
});
