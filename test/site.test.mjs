// mcpkeel.app's Worker, which renders /drift from the canary's feed.json, and
// the canary's recorder, which writes that file.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import worker, { escapeHtml, parseFeed, renderDrift, summarize } from "../site/src/worker.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const FEED = {
  lastChecked: "2026-11-10",
  nights: ["2026-11-07", "2026-11-08", "2026-11-09", "2026-11-10"],
  servers: [
    { name: "context7", status: "ok", version: "4.6.0" },
    { name: "playwright", status: "drift", version: "1.66.0" },
  ],
  notChecked: [],
  days: [
    { date: "2026-11-09", changes: 2, bySeverity: { critical: 0, high: 1, medium: 0, low: 1 }, servers: ["context7"] },
    { date: "2026-11-10", changes: 3, bySeverity: { critical: 0, high: 2, medium: 0, low: 1 }, servers: ["playwright"] },
  ],
};

test("the summary counts compared nights, not the baseline night", () => {
  const s = summarize(parseFeed(FEED));
  assert.equal(s.since, "2026-11-07");
  assert.equal(s.compared, 3);
  assert.equal(s.driftNights, 2);
  assert.equal(s.changes, 5);
  assert.deepEqual(s.totals, { critical: 0, high: 3, medium: 0, low: 2 });
  assert.equal(s.perServer.get("context7"), 1);
});

test("the page leads with the drift rate and lists every night and server", () => {
  const html = renderDrift(parseFeed(FEED));
  assert.match(html, /changed on <b>2 of 3 nights<\/b>/);
  assert.match(html, /history\/2026-11-10\.md/);
  assert.match(html, /<code>playwright<\/code>/);
  assert.match(html, /none was graded critical/);
  // Newest night first.
  assert.ok(html.indexOf("2026-11-10.md") < html.indexOf("2026-11-09.md"));
});

test("a feed of the wrong shape is refused, not rendered", () => {
  assert.throws(() => parseFeed(null));
  assert.throws(() => parseFeed({ ...FEED, lastChecked: "yesterday" }));
  assert.throws(() => parseFeed({ ...FEED, servers: [{ name: "<script>alert(1)</script>", status: "ok" }] }));
  assert.throws(() => parseFeed({ ...FEED, days: [{ ...FEED.days[0], changes: -1 }] }));
  assert.throws(() => parseFeed({ ...FEED, days: [{ ...FEED.days[0], date: "2026-11-09\"><img>" }] }));
});

test("escapeHtml covers every character that can leave text or an attribute", () => {
  assert.equal(escapeHtml(`<a href="x" onclick='y'>&</a>`), "&lt;a href=&quot;x&quot; onclick=&#39;y&#39;&gt;&amp;&lt;/a&gt;");
});

test("the Worker answers /drift with the site's security headers, and hands the rest to the assets", async () => {
  const realFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify(FEED), { status: 200 });
  try {
    const assets = { fetch: async () => new Response("asset") };
    const page = await worker.fetch(new Request("https://mcpkeel.app/drift"), { ASSETS: assets });
    assert.equal(page.status, 200);
    assert.match(page.headers.get("content-security-policy"), /default-src 'none'/);
    assert.match(await page.text(), /MCP drift feed/);
    const other = await worker.fetch(new Request("https://mcpkeel.app/privacy"), { ASSETS: assets });
    assert.equal(await other.text(), "asset");

    globalThis.fetch = async () => new Response("{}", { status: 200 });
    const broken = await worker.fetch(new Request("https://mcpkeel.app/drift"), { ASSETS: assets });
    assert.equal(broken.status, 503);
    assert.equal(broken.headers.get("cache-control"), "no-store");
  } finally {
    globalThis.fetch = realFetch;
  }
});

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
  // The page accepts what the recorder writes.
  assert.equal(summarize(parseFeed(feed)).driftNights, 1);

  // The next night appends to feed.json, without reading the commits again.
  execFileSync(process.execPath, [join(root, "canary", "record.mjs"), artifact, data, "2026-11-04"], { stdio: "ignore" });
  assert.equal(JSON.parse(readFileSync(join(data, "feed.json"), "utf8")).nights.length, 4);
});
