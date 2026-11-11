// mcpkeel.app: static assets, plus /drift, the nightly drift feed.
//
// /drift is rendered here from feed.json in the canary-data branch, which the
// nightly canary rewrites. The fetch happens on Cloudflare, so a visitor's
// browser only ever talks to mcpkeel.app, and the page keeps the same strict
// Content-Security-Policy as the rest of the site. Every value from the feed
// is checked against an expected shape and HTML-escaped before it is shown.

export const FEED_URL = "https://raw.githubusercontent.com/mcpkeel/mcpkeel/canary-data/feed.json";
const BRANCH_URL = "https://github.com/mcpkeel/mcpkeel/tree/canary-data";
const DAY_URL = "https://github.com/mcpkeel/mcpkeel/blob/canary-data/history/";
const SEVERITIES = ["critical", "high", "medium", "low"];

// The headers public/_headers gives the static pages; a Worker's own
// responses do not get those, so they are set here.
const SECURITY_HEADERS = {
  "Content-Security-Policy":
    "default-src 'none'; style-src 'self'; script-src 'self'; font-src 'self'; img-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname !== "/drift" && url.pathname !== "/drift/") return env.ASSETS.fetch(request);
    if (request.method !== "GET" && request.method !== "HEAD") return new Response("Method not allowed", { status: 405, headers: { Allow: "GET, HEAD" } });

    let feed;
    try {
      // Workers support only "follow" and "manual". With "manual" a redirect
      // comes back as a 3xx, which is not ok, so it is refused below.
      const response = await fetch(FEED_URL, { cf: { cacheTtl: 900, cacheEverything: true }, redirect: "manual" });
      if (!response.ok) throw new Error(`feed: HTTP ${response.status}`);
      feed = parseFeed(await response.json());
    } catch (error) {
      console.error(String(error));
      return html(renderUnavailable(), 503, "no-store");
    }
    return html(renderDrift(feed), 200, "public, max-age=900");
  },
};

function html(body, status, cacheControl) {
  return new Response(body, {
    status,
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": cacheControl, ...SECURITY_HEADERS },
  });
}

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const NAME = /^[A-Za-z0-9_.@/-]{1,80}$/;

/** The feed as the page needs it. Anything of the wrong shape is an error, not a guess. */
export function parseFeed(raw) {
  const fail = (what) => {
    throw new Error(`feed: ${what}`);
  };
  if (!raw || typeof raw !== "object") fail("not an object");
  if (!DATE.test(raw.lastChecked ?? "")) fail("lastChecked");
  if (!Array.isArray(raw.nights) || !raw.nights.every((d) => DATE.test(d))) fail("nights");
  if (!Array.isArray(raw.servers) || !Array.isArray(raw.days)) fail("servers or days");
  const count = (n) => (Number.isInteger(n) && n >= 0 ? n : fail("count"));
  const name = (s) => (typeof s === "string" && NAME.test(s) ? s : fail("name"));
  return {
    lastChecked: raw.lastChecked,
    nights: [...raw.nights].sort(),
    servers: raw.servers.map((s) => ({
      name: name(s?.name),
      status: name(s?.status),
      version: s?.version == null ? null : name(s.version),
    })),
    notChecked: (Array.isArray(raw.notChecked) ? raw.notChecked : []).map((s) => name(s?.server)),
    days: raw.days
      .map((d) => {
        if (!DATE.test(d?.date ?? "")) fail("day date");
        const bySeverity = Object.fromEntries(SEVERITIES.map((level) => [level, count(d.bySeverity?.[level] ?? 0)]));
        return { date: d.date, changes: count(d.changes), bySeverity, servers: (d.servers ?? []).map(name) };
      })
      .sort((a, b) => (a.date < b.date ? 1 : -1)),
  };
}

export function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;

/** The numbers the page leads with. The first night only pins a baseline, so it is not a comparison. */
export function summarize(feed) {
  const compared = feed.nights.slice(1);
  const driftNights = new Set(feed.days.map((d) => d.date).filter((d) => compared.includes(d)));
  const totals = Object.fromEntries(SEVERITIES.map((level) => [level, 0]));
  const perServer = new Map();
  for (const day of feed.days) {
    if (!driftNights.has(day.date)) continue;
    for (const level of SEVERITIES) totals[level] += day.bySeverity[level];
    for (const server of day.servers) perServer.set(server, (perServer.get(server) ?? 0) + 1);
  }
  return {
    since: feed.nights[0],
    compared: compared.length,
    driftNights: driftNights.size,
    changes: SEVERITIES.reduce((n, level) => n + totals[level], 0),
    totals,
    perServer,
  };
}

function page(title, description, body) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(description)}">
<link rel="canonical" href="https://mcpkeel.app/drift">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="/styles.css">
</head>
<body>
<header class="masthead wrap">
  <a class="wordmark" href="/" aria-label="mcpkeel home">
    <svg viewBox="0 0 32 32" width="26" height="26" aria-hidden="true"><path d="M3 7 Q16 27 29 7" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><path d="M16 17 V30" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>
    <span>mcpkeel</span>
  </a>
</header>
<main class="wrap page drift">
${body}
</main>
</body>
</html>
`;
}

export function renderDrift(feed) {
  const s = summarize(feed);
  const grade = (counts) =>
    SEVERITIES.filter((level) => counts[level] > 0)
      .map((level) => `<span class="sev sev-${level}">${counts[level]} ${level}</span>`)
      .join(", ");
  const rows = feed.days
    .map(
      (day) => `    <tr>
      <td><a href="${DAY_URL}${escapeHtml(day.date)}.md">${escapeHtml(day.date)}</a></td>
      <td>${day.changes} <span class="quiet">(${grade(day.bySeverity)})</span></td>
      <td>${day.servers.map((name) => `<code>${escapeHtml(name)}</code>`).join(", ")}</td>
    </tr>`,
    )
    .join("\n");
  const servers = feed.servers
    .map(
      (server) => `    <tr>
      <td><code>${escapeHtml(server.name)}</code></td>
      <td>${server.version ? escapeHtml(server.version) : '<span class="quiet">unknown</span>'}</td>
      <td>${s.perServer.get(server.name) ?? 0}</td>
      <td>${server.status === "drift" ? '<span class="sev sev-high">changed last night</span>' : escapeHtml(server.status)}</td>
    </tr>`,
    )
    .join("\n");
  const lede = `Every night, mcpkeel starts ${plural(feed.servers.length, "popular public MCP server")} the way most configs do, with no version pinned, and compares what they tell an agent with the night before. Since ${escapeHtml(s.since)}, what they send changed on <b>${s.driftNights} of ${s.compared} nights</b>.`;
  const body = `  <h1>MCP drift feed</h1>
  <p class="lede">${lede}</p>
  <p class="fine">Last checked ${escapeHtml(feed.lastChecked)}.${feed.notChecked.length ? ` Not checked last night: ${feed.notChecked.map((n) => `<code>${escapeHtml(n)}</code>`).join(", ")}.` : ""} The data, and mcpkeel's report for each day, are in the <a href="${BRANCH_URL}"><code>canary-data</code></a> branch.</p>

  <ul class="facts-inline" aria-label="Totals">
    <li><b>${s.changes}</b> changes</li>
    ${SEVERITIES.map((level) => `<li><b class="sev sev-${level}">${s.totals[level]}</b> ${level}</li>`).join("\n    ")}
  </ul>

  <h2>What this shows</h2>
  <p>Real servers change often, and almost always for ordinary reasons: a new release, a reworded description, a parameter added. Unpinned, each of those reaches your agent the next time it connects, without anyone reading it. ${
    s.totals.critical
      ? `${plural(s.totals.critical, "change")} tripped a built-in check and ${s.totals.critical === 1 ? "was" : "were"} graded critical; the day's report says which.`
      : "None of these changes tripped a built-in check, so none was graded critical."
  } Each one was still a change to text an agent reads as guidance.</p>
  <p>That is the case for pinning: <code>npx -y server@1.4.2</code> changes only when you change it, and <code>mcpkeel verify</code> fails the build when what a pinned server sends differs from <code>mcp.lock</code>.</p>

  <h2>Nights with changes</h2>
  <div class="table-scroll">
  <table>
    <thead><tr><th scope="col">Night</th><th scope="col">Changes</th><th scope="col">Servers</th></tr></thead>
    <tbody>
${rows || '    <tr><td colspan="3">No changes recorded yet.</td></tr>'}
    </tbody>
  </table>
  </div>

  <h2>Servers</h2>
  <div class="table-scroll">
  <table>
    <thead><tr><th scope="col">Server</th><th scope="col">Version last night</th><th scope="col">Nights changed</th><th scope="col">Status</th></tr></thead>
    <tbody>
${servers}
    </tbody>
  </table>
  </div>
  <p class="fine">How each server is started: <a href="https://github.com/mcpkeel/mcpkeel/blob/main/canary/.mcp.json"><code>canary/.mcp.json</code></a>. The servers run as third-party code at whatever version they ship that night, in a job with no credentials. Try it on your own config: <code>npx mcpkeel init</code>.</p>`;
  return page(
    "MCP drift feed | mcpkeel",
    `What ${feed.servers.length} popular MCP servers changed, night by night: ${s.driftNights} of ${s.compared} nights since ${s.since}.`,
    body,
  );
}

export function renderUnavailable() {
  return page(
    "MCP drift feed | mcpkeel",
    "The nightly MCP drift feed.",
    `  <h1>MCP drift feed</h1>
  <p class="lede">The feed could not be read just now. The data is also in the <a href="${BRANCH_URL}"><code>canary-data</code></a> branch.</p>`,
  );
}
