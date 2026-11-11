import Link from "next/link";
import { SITE } from "@/lib/site";
import { CopyCommand } from "./copy-command";

export function SiteFooter() {
  return (
    <footer className="wrap">
      <CopyCommand command="npx mcpkeel demo" />
      <p>
        Questions and vulnerability reports: <a href={`mailto:${SITE.email}`}>{SITE.email}</a>. The package is on <a href={SITE.npm}>npm</a> and
        the source is on <a href={SITE.repo}>GitHub</a>.
      </p>
      <p className="fine">
        mcpkeel is an independent project, MIT licensed. It is not affiliated with any model provider or with the Model Context Protocol project.{" "}
        <Link href="/privacy">Privacy</Link>.
      </p>
    </footer>
  );
}
