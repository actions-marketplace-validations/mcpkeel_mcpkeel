import type { Metadata } from "next";
import { BRANCH_URL, DAY_URL, SEVERITIES, loadFeed, summarize, type Feed, type SeverityCounts } from "@/lib/feed";

// Rendered per request: the feed changes every night, and the page should
// show the latest without a redeploy.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "MCP drift feed",
  description: "What nine popular public MCP servers change, night by night, measured by mcpkeel.",
  alternates: { canonical: "/drift" },
};

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

function Grade({ counts }: { counts: SeverityCounts }) {
  const parts = SEVERITIES.filter((level) => counts[level] > 0);
  return (
    <>
      {parts.map((level, i) => (
        <span key={level}>
          {i > 0 && ", "}
          <span className={`sev sev-${level}`}>
            {counts[level]} {level}
          </span>
        </span>
      ))}
    </>
  );
}

function Unavailable() {
  return (
    <main id="main" className="wrap page drift">
      <h1>MCP drift feed</h1>
      <p className="lede">
        The feed could not be read just now. The data is also in the <a href={BRANCH_URL}>canary-data</a> branch.
      </p>
    </main>
  );
}

function DriftFeed({ feed }: { feed: Feed }) {
  const s = summarize(feed);
  return (
    <main id="main" className="wrap page drift">
      <h1>MCP drift feed</h1>
      <p className="lede">
        Every night, mcpkeel starts {plural(feed.servers.length, "popular public MCP server")} the way most configs do, with no version pinned, and
        compares what they tell an agent with the night before. Since {s.since}, what they send changed on{" "}
        <b>
          {s.driftNights} of {s.compared} nights
        </b>
        .
      </p>
      <p className="fine">
        Last checked {feed.lastChecked}.
        {feed.notChecked.length > 0 && <> Not checked last night: {feed.notChecked.join(", ")}.</>} The data, and mcpkeel&apos;s report for each day,
        are in the <a href={BRANCH_URL}>canary-data</a> branch.
      </p>

      <ul className="facts-inline" aria-label="Totals">
        <li>
          <b>{s.changes}</b> changes
        </li>
        {SEVERITIES.map((level) => (
          <li key={level}>
            <b className={`sev sev-${level}`}>{s.totals[level]}</b> {level}
          </li>
        ))}
      </ul>

      <h2>What this shows</h2>
      <p>
        Real servers change often, and almost always for ordinary reasons: a new release, a reworded description, a parameter added. Unpinned, each of
        those reaches your agent the next time it connects, without anyone reading it.{" "}
        {s.totals.critical > 0
          ? `${plural(s.totals.critical, "change")} tripped a built-in check and ${s.totals.critical === 1 ? "was" : "were"} graded critical; the day's report says which.`
          : "None of these changes tripped a built-in check, so none was graded critical."}{" "}
        Each one was still a change to text an agent reads as guidance.
      </p>
      <p>
        That is the case for pinning: <code>npx -y server@1.4.2</code> changes only when you change it, and <code>mcpkeel verify</code> fails the build
        when what a pinned server sends differs from <code>mcp.lock</code>.
      </p>

      <h2>Nights with changes</h2>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th scope="col">Night</th>
              <th scope="col">Changes</th>
              <th scope="col">Servers</th>
            </tr>
          </thead>
          <tbody>
            {feed.days.length === 0 && (
              <tr>
                <td colSpan={3}>No changes recorded yet.</td>
              </tr>
            )}
            {feed.days.map((day) => (
              <tr key={day.date}>
                <td>
                  <a href={`${DAY_URL}${day.date}.md`}>{day.date}</a>
                </td>
                <td>
                  {day.changes}{" "}
                  <span className="quiet">
                    (<Grade counts={day.bySeverity} />)
                  </span>
                </td>
                <td>
                  {day.servers.map((name, i) => (
                    <span key={name}>
                      {i > 0 && ", "}
                      <code>{name}</code>
                    </span>
                  ))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2>Servers</h2>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th scope="col">Server</th>
              <th scope="col">Version last night</th>
              <th scope="col">Nights changed</th>
              <th scope="col">Status</th>
            </tr>
          </thead>
          <tbody>
            {feed.servers.map((server) => (
              <tr key={server.name}>
                <td>
                  <code>{server.name}</code>
                </td>
                <td>{server.version ?? <span className="quiet">unknown</span>}</td>
                <td>{s.perServer.get(server.name) ?? 0}</td>
                <td>{server.status === "drift" ? <span className="sev sev-high">changed last night</span> : server.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="fine">
        How each server is started: <a href="https://github.com/mcpkeel/mcpkeel/blob/main/canary/.mcp.json">canary/.mcp.json</a>. The servers run as
        third-party code at whatever version they ship that night, in a job with no credentials. Try it on your own config:{" "}
        <code>npx mcpkeel init</code>.
      </p>
    </main>
  );
}

export default async function DriftPage() {
  let feed: Feed;
  try {
    feed = await loadFeed();
  } catch (error) {
    console.error(error);
    return <Unavailable />;
  }
  return <DriftFeed feed={feed} />;
}
