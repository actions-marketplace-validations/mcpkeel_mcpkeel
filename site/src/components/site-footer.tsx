import Link from "next/link";
import { SITE } from "@/lib/site";
import { CopyCommand } from "./copy-command";

export function SiteFooter() {
  return (
    <footer className="wrap">
      <CopyCommand command="npx mcpkeel demo" />
      <nav className="footer-map" aria-label="Site">
        <div className="footer-intro">
          <h2>mcpkeel</h2>
          <p>The lockfile for MCP. An independent, MIT-licensed project, not affiliated with any model provider or with the Model Context Protocol project.</p>
        </div>
        <div>
          <h2>Product</h2>
          <ul className="bare">
            <li>
              <Link href="/#how">How it works</Link>
            </li>
            <li>
              <Link href="/drift">Drift feed</Link>
            </li>
            <li>
              <a href={SITE.example}>Example repository</a>
            </li>
            <li>
              <a href={SITE.releases}>Changelog</a>
            </li>
          </ul>
        </div>
        <div>
          <h2>Trust</h2>
          <ul className="bare">
            <li>
              <Link href="/security">Security</Link>
            </li>
            <li>
              <a href={SITE.evidence}>Evidence for every claim</a>
            </li>
            <li>
              <a href={SITE.measured}>How it was measured</a>
            </li>
            <li>
              <Link href="/privacy">Privacy</Link>
            </li>
          </ul>
        </div>
        <div>
          <h2>Project</h2>
          <ul className="bare">
            <li>
              <a href={SITE.repo}>GitHub</a>
            </li>
            <li>
              <a href={SITE.npm}>npm</a>
            </li>
            <li>
              <a href={`mailto:${SITE.email}`}>{SITE.email}</a>
            </li>
          </ul>
        </div>
      </nav>
    </footer>
  );
}
