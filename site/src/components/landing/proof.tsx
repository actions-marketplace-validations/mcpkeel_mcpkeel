import Link from "next/link";
import { SITE } from "@/lib/site";

// Measured numbers, each linked to where it was measured. They come from
// eval/results/explain.json and docs/EVIDENCE.md for mcpkeel 0.5.0; update
// them with the next recorded run, not by hand.
export function Proof() {
  return (
    <section className="proof wrap" aria-label="Measured">
      <ul>
        <li>
          <span className="figure figure-critical">99.8%</span>
          <span className="label">of 485 poisoned tools from the MCPTox benchmark graded critical with a model review</span>
          <a className="source" href={SITE.measured}>
            How it was measured
          </a>
        </li>
        <li>
          <span className="figure">10.3%</span>
          <span className="label">graded critical by the built-in checks alone. Every one is still reported as drift.</span>
          <a className="source" href={SITE.measured}>
            Why both matter
          </a>
        </li>
        <li>
          <span className="figure">0</span>
          <span className="label">attacks lowered to low by the reviewer, in every recorded run: six models, up to 515 attacks each</span>
          <a className="source" href={SITE.evidence}>
            The runs
          </a>
        </li>
        <li>
          <span className="figure">Nightly</span>
          <span className="label">nine popular public servers, unpinned, compared with the night before</span>
          <Link className="source" href="/drift">
            The drift feed
          </Link>
        </li>
      </ul>
    </section>
  );
}
