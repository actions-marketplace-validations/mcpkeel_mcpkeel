import type { Metadata } from "next";
import Link from "next/link";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Security",
  description: "How mcpkeel releases are built and signed, how to verify the copy you install, what mcpkeel touches, and how to report a vulnerability.",
  alternates: { canonical: "/security" },
};

export default function Security() {
  return (
    <main id="main" className="wrap page">
      <h1>Security</h1>
      <p className="lede">mcpkeel sits in your CI and starts the servers in your MCP config. Here is how its releases are built, what it does with that trust, and how to tell us when it gets something wrong.</p>

      <h2 id="report">Report a vulnerability</h2>
      <p>
        Email <a href={`mailto:${SITE.email}`}>{SITE.email}</a> with what you found and how to reproduce it. Please do not open a public issue for a
        vulnerability. You will get a reply within a few days; a confirmed issue is fixed as soon as the fix is ready, with credit in the release notes
        unless you prefer otherwise.
      </p>
      <p>These count as vulnerabilities:</p>
      <ul className="plain">
        <li>a way to make <code>mcpkeel verify</code> pass when a pinned definition has changed;</li>
        <li>a way for a server, a config file or a lockfile to make mcpkeel run code or write files it should not;</li>
        <li>a way for secrets (environment values, headers, credentials in a URL) to end up in <code>mcp.lock</code> or in a request made by <code>--explain</code>.</li>
      </ul>

      <h2 id="verify">Verify what you install</h2>
      <p>
        Every release is built and published by GitHub Actions from a tagged commit, through npm trusted publishing: no token is stored anywhere, and
        each version carries a signed provenance statement that names the workflow and the commit it came from.
      </p>
      <pre>
        <code>{`npm view mcpkeel@${SITE.version} dist.attestations.provenance.predicateType
# https://slsa.dev/provenance/v1

npm audit signatures   # in a project that depends on mcpkeel`}</code>
      </pre>
      <p>
        The GitHub Action runs the same package, pinned to an exact version. Pin the action itself to a commit in workflows that can write:{" "}
        <code>{`mcpkeel/mcpkeel@<commit> # v${SITE.version}`}</code>.
      </p>
      <p>
        Every claim on this site comes from a recorded run in <a href={SITE.evidence}>docs/EVIDENCE.md</a>, and the measurements and how they were
        made are in <a href={SITE.measured}>the README</a>.
      </p>

      <h2 id="touches">What mcpkeel touches</h2>
      <ul className="plain">
        <li>It starts the servers in the MCP config it reads, with the permissions of the job, and connects to the remote ones. On a pull request that is the pull request&apos;s config: give that job no secrets on forks and a read-only token.</li>
        <li>It asks the npm registry, PyPI or an image registry which release each launcher will run. <code>--no-resolve</code> turns this off.</li>
        <li>
          When an npm release changed, it reads both releases from that registry, checks each against its pinned digest before reading it, and unpacks
          it in memory within fixed limits. Nothing in a package is run or written to disk. <code>--no-release-diff</code> turns this off.
        </li>
        <li>Only with <code>--explain</code>, it sends the changed definitions, and nothing else, to the review endpoint you choose. The key is never handed to the servers it starts.</li>
        <li>
          It refuses remote servers on link-local or cloud metadata addresses, and follows no redirects from servers, registries or the review endpoint.
        </li>
        <li><code>mcp.lock</code> never contains environment values or headers, and URLs are stored without credentials or query strings.</li>
      </ul>

      <h2 id="dependencies">Dependencies</h2>
      <p>
        Two direct dependencies: the official MCP TypeScript SDK, on its 1.x line, and <code>smol-toml</code>, pinned to an exact version, to read
        Codex configs. Updates to either are proposed only after a release has been public for two weeks. See also the <Link href="/privacy">privacy page</Link>.
      </p>
    </main>
  );
}
