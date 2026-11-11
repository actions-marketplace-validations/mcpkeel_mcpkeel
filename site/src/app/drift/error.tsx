"use client";

import { BRANCH_URL } from "@/lib/feed";

/** The feed could not be read: the response is an error, and the data is still on GitHub. */
export default function DriftError() {
  return (
    <main id="main" className="wrap page drift">
      <h1>MCP drift feed</h1>
      <p className="lede">
        The feed could not be read just now. The data is also in the <a href={BRANCH_URL}>canary-data</a> branch.
      </p>
    </main>
  );
}
