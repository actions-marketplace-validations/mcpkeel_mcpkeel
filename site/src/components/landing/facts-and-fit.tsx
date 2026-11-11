const PINNED = [
  "Tool names, titles and descriptions",
  "Input and output schemas, including every parameter name and description",
  "Tool annotations, such as read-only",
  "Prompts and their arguments",
  "The server's instructions",
  "The server's name and version",
  "The release the launch command runs, with the registry's digest of it",
];

export function Facts() {
  return (
    <section className="facts wrap" aria-label="What is pinned and what stays local">
      <div className="pinned">
        <h2>What gets pinned</h2>
        <ul className="plain">
          {PINNED.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <p className="fine">
          The same servers always produce a byte-identical <code>mcp.lock</code>, with no timestamps, so it only appears in a diff when something
          changed.
        </p>
      </div>
      <div className="local">
        <h2>What stays on your machine</h2>
        <ul className="plain">
          <li>mcpkeel has no telemetry and no account.</li>
          <li>
            It talks to your MCP servers, to the package registries to look up the release each one runs, and, only with <code>--explain</code>, to the
            review endpoint you choose. It does not hand its keys to the servers it starts.
          </li>
          <li>
            <code>mcp.lock</code> never contains environment values or headers. URLs are stored without credentials or query strings.
          </li>
          <li>It has two direct dependencies: the official MCP TypeScript SDK, and a TOML reader for Codex configs.</li>
        </ul>
      </div>
    </section>
  );
}

const FIT = [
  {
    title: "At build time, in your repository.",
    body: "mcpkeel is the gate between a server's next release and your agent. It runs in CI, on every pull request and on a schedule, and turns a change to a server into a diff someone reviews.",
  },
  {
    title: "Next to code review.",
    body: "It names the release that changed and every line of text that changed with it, so reviewing a new server release starts from a diff instead of a hunt.",
  },
  {
    title: "Next to a runtime guard.",
    body: "It checks what a server declares before your agent connects. What a tool returns while it runs is a runtime guard's job. Together they cover both ends.",
  },
  {
    title: "With the clients and models you already use.",
    body: "Claude Code, Cursor, VS Code, opencode, Codex and Gemini CLI configs, local and remote servers, and the review model of your choice, including one on your own machine.",
  },
];

export function Fit() {
  return (
    <section className="fit wrap" aria-labelledby="fit-title">
      <h2 id="fit-title">Where it fits</h2>
      <dl className="fit-list">
        {FIT.map((item) => (
          <div key={item.title}>
            <dt>{item.title}</dt>
            <dd>{item.body}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
