import { SITE } from "@/lib/site";

const WORKFLOW = `on:
  pull_request:
  schedule:
    - cron: "0 9 * * *"
permissions:
  contents: read
  security-events: write
jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - uses: actions/setup-node@v7
        with:
          node-version: 22
      - uses: mcpkeel/mcpkeel@v${SITE.version}
        with:
          probe: true
          sarif: mcpkeel.sarif
      - uses: github/codeql-action/upload-sarif@v4
        if: always()
        with:
          sarif_file: mcpkeel.sarif`;

const STEPS = [
  {
    title: "Pin",
    body: (
      <>
        mcpkeel reads your MCP config, connects to each server, and writes every tool, prompt and server instruction to <code>mcp.lock</code>. Read
        it, then commit it.
      </>
    ),
    command: "npx mcpkeel init",
  },
  {
    title: "Verify",
    body: <>In CI, mcpkeel reconnects and compares. It exits 1 if anything changed. If a server cannot be reached it exits 2 instead of passing.</>,
    command: "npx mcpkeel verify",
  },
  {
    title: "Accept",
    body: <>When a change is one you expected, accept it. The lockfile diff then goes through code review like any other change.</>,
    command: "npx mcpkeel update",
  },
];

const CLIENTS = ["Claude Code", "Cursor", "VS Code", "opencode", "Codex", "Gemini CLI"];

export function HowItWorks() {
  return (
    <section className="how wrap" id="how" aria-labelledby="how-title">
      <h2 id="how-title">Three commands</h2>
      <ol className="steps">
        {STEPS.map((step) => (
          <li key={step.title}>
            <h3>{step.title}</h3>
            <p>{step.body}</p>
            <pre>
              <code>{step.command}</code>
            </pre>
          </li>
        ))}
      </ol>

      <div className="ci">
        <div>
          <h3>Add it to a workflow</h3>
          <p>Run it on pull requests and on a schedule. Servers change on their schedule, not yours.</p>
          <p>
            The action can also open a pull request with the report when a server changes, so a change becomes a review to merge or close and not a
            red build to mute.
          </p>
          <p>
            With <code>sarif</code>, each change also becomes a GitHub code-scanning alert, with a stable code and its OWASP MCP Top 10 category.
          </p>
          <p>
            <a href={SITE.example}>See it running in a real repository</a>: five pinned servers, both workflows, green.
          </p>
          <p className="clients-label">Reads the MCP config of</p>
          <ul className="clients">
            {CLIENTS.map((client) => (
              <li key={client}>{client}</li>
            ))}
          </ul>
          <p className="fine">Local stdio servers, Streamable HTTP and SSE. One server pins the same way whichever client&apos;s file it is in.</p>
        </div>
        <pre tabIndex={0} aria-label="GitHub Actions example">
          <code>{WORKFLOW}</code>
        </pre>
      </div>
    </section>
  );
}
