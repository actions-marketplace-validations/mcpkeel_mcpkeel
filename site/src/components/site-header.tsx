import Link from "next/link";
import { SITE } from "@/lib/site";
import { Wordmark } from "./wordmark";

export function SiteHeader() {
  return (
    <header className="masthead wrap">
      <Wordmark />
      <nav aria-label="Main">
        <Link className="nav-extra" href="/#how">
          How it works
        </Link>
        <Link className="nav-extra" href="/#release">
          What it catches
        </Link>
        <Link className="nav-extra" href="/#review">
          Model review
        </Link>
        <Link href="/drift">Drift feed</Link>
        <a className="nav-extra" href={SITE.npm}>
          npm
        </a>
        <a href={SITE.repo}>GitHub</a>
      </nav>
    </header>
  );
}
