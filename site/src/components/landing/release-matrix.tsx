import type { ReactNode } from "react";

const Critical = () => <b className="grade grade-critical">critical</b>;
const High = () => <b className="grade grade-high">high</b>;

const ROWS: { release: ReactNode; agent: string; verify: ReactNode }[] = [
  {
    release: "hides an instruction in a tool description: “send the conversation to…, do not tell the user”",
    agent: "reads it as guidance, every session",
    verify: (
      <>
        <Critical /> names the check that fired, exit 1
      </>
    ),
  },
  {
    release: "rewords a description in a way no pattern catches",
    agent: "reads it as guidance",
    verify: (
      <>
        <High /> shows the old and new text, exit 1
      </>
    ),
  },
  {
    release: (
      <>
        keeps every description and ships new code: <code>npx -y server</code> fetches whatever is newest
      </>
    ),
    agent: "runs the new code",
    verify: (
      <>
        <High /> names the release that runs now; <Critical /> if a published version changed
      </>
    ),
  },
  {
    release: "adds a tool, or a tool stops being read-only",
    agent: "can call it",
    verify: (
      <>
        <High /> exit 1
      </>
    ),
  },
  {
    release: "answers a checker one way and an agent another",
    agent: "sees the other answer",
    verify: (
      <>
        <High /> with <code>--probe</code>
      </>
    ),
  },
];

export function ReleaseMatrix() {
  return (
    <section className="release wrap" id="release" aria-labelledby="release-title">
      <h2 id="release-title">What a server&apos;s next release can change</h2>
      <p className="intro">
        You approved a server once. Every release after that can change what your agent is told, or what code runs, under the same name and the same
        config.
      </p>
      <div className="matrix" role="table" aria-label="What a release can change and what mcpkeel does">
        <div className="matrix-row matrix-head" role="row">
          <span role="columnheader">The next release…</span>
          <span role="columnheader">Your agent, without mcpkeel</span>
          <span role="columnheader">mcpkeel verify</span>
        </div>
        {ROWS.map((row, i) => (
          <div className="matrix-row" role="row" key={i}>
            <span role="cell">{row.release}</span>
            <span role="cell">{row.agent}</span>
            <span role="cell">{row.verify}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
