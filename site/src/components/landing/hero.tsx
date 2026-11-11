import { CopyCommand } from "../copy-command";

/** The course line: what was pinned, and where what a server sends today drifts from it. */
function Course() {
  return (
    <svg className="course" viewBox="0 0 1120 150" aria-hidden="true" focusable="false">
      <path className="course-line" d="M0 12 H1120" />
      <circle className="fix" cx="236" cy="12" r="9" />
      <circle className="fix-dot" cx="236" cy="12" r="2.6" />
      <g className="track">
        <path className="track-line" d="M612 12 C 770 12 880 44 1120 132" />
        <path className="gap" d="M1076 22 V108 M1068 22 H1084 M1068 108 H1084" />
        <text className="gap-label" x="1058" y="74" textAnchor="end">
          drift
        </text>
      </g>
      <path className="departure" d="M612 0 L624 21 H600 Z" />
    </svg>
  );
}

export function Hero() {
  return (
    <section className="hero wrap" aria-labelledby="hero-title">
      <h1 id="hero-title">The lockfile for MCP</h1>
      <Course />
      <div className="hero-body">
        <div className="hero-copy">
          <p className="lede">
            An MCP server can rewrite the tool descriptions your agent trusts, at any time, and nothing tells you. mcpkeel pins them in a file you
            commit and fails the build when they change.
          </p>
          <ul className="paths" aria-label="Try it">
            <li>
              <span className="path-label">Try it</span>
              <CopyCommand command="npx mcpkeel demo" />
              <span className="path-note">A local server turns malicious and the build fails. No config, no network.</span>
            </li>
          </ul>
          <p className="fine">MIT licensed, no account, no telemetry. Releases are signed with npm provenance. Needs Node 22 or later.</p>
        </div>
        <ul className="legend" aria-label="How to read the drawing">
          <li>
            <svg viewBox="0 0 40 20" aria-hidden="true">
              <path className="course-line" d="M0 10 H40" />
              <circle className="fix" cx="20" cy="10" r="6" />
              <circle className="fix-dot" cx="20" cy="10" r="2" />
            </svg>
            <span>
              <b>init</b> pins the definitions you reviewed in <code>mcp.lock</code>.
            </span>
          </li>
          <li>
            <svg viewBox="0 0 40 20" aria-hidden="true">
              <path className="track-line" d="M0 6 C 16 6 26 9 40 16" />
            </svg>
            <span>
              <i>What the server sends today</i> can leave that course without notice.
            </span>
          </li>
          <li>
            <svg viewBox="0 0 40 20" aria-hidden="true">
              <path className="course-line" d="M0 14 H40" />
              <path className="departure" d="M20 3 L28 17 H12 Z" />
            </svg>
            <span>
              <b>verify</b> fails the build at the point where they part.
            </span>
          </li>
        </ul>
      </div>
    </section>
  );
}
