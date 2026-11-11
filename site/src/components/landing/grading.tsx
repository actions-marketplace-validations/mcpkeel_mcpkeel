const BANDS = [
  {
    level: "critical",
    title: "Critical",
    body: "New text that trips a built-in check: instruction-like markup, hidden or encoded text, references to credential files, requests for the conversation or the user's keys, attempts to steer other tools or to hide actions. The checks also read the text backwards, decoded and with look-alike letters replaced, and read a tool's fields together. A published package release whose contents changed.",
  },
  {
    level: "high",
    title: "High",
    body: "A tool description, a parameter description or the server's instructions changed. A tool was added. A tool stopped being marked read-only. The launch command now starts a different program, or the launcher now runs a different release.",
  },
  {
    level: "medium",
    title: "Medium",
    body: "A parameter was added, removed or retyped. A tool was removed. A prompt changed. The launch arguments changed.",
  },
  { level: "low", title: "Low", body: "The version the server reports changed. An output schema changed." },
] as const;

export function Grading() {
  return (
    <section className="grading wrap" id="grading" aria-labelledby="grading-title">
      <h2 id="grading-title">How a change is graded</h2>
      <p className="intro">The closer a change is to text your agent reads as guidance, the higher it grades. On a chart, the darkest water is the shallowest.</p>
      <dl className="soundings">
        {BANDS.map((band) => (
          <div className={`band band-${band.level}`} key={band.level}>
            <dt>{band.title}</dt>
            <dd>{band.body}</dd>
          </div>
        ))}
      </dl>
      <p className="caption">
        Every change is recorded whatever its grade, with a code that never changes meaning. <code>mcpkeel verify --fail-on high</code> lets medium and
        low changes through, and <code>mcpkeel.json</code> records a team&apos;s decisions about findings, each with a reason.
      </p>
    </section>
  );
}
