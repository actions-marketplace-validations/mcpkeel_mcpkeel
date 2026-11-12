import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false },
};

export default function NotFound() {
  return (
    <main id="main" className="wrap lost">
      <h1>Off the chart</h1>
      <p className="lede">
        There is no page at this address. Everything mcpkeel has is on the <Link href="/">home page</Link>.
      </p>
    </main>
  );
}
