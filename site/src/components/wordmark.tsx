import Link from "next/link";

export function Wordmark() {
  return (
    <Link className="wordmark" href="/" aria-label="mcpkeel home">
      <svg viewBox="0 0 32 32" width="26" height="26" aria-hidden="true">
        <path d="M3 7 Q16 27 29 7" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        <path d="M16 17 V30" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      </svg>
      <span>mcpkeel</span>
    </Link>
  );
}
