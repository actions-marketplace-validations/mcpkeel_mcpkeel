// The security headers every response carries, and the Content-Security-Policy
// for HTML pages. Used by worker.ts; kept here, free of Workers APIs, so it
// can be tested on its own.

export const BASE_HEADERS: Readonly<Record<string, string>> = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
  "Cross-Origin-Opener-Policy": "same-origin",
};

/**
 * A strict policy for one HTML response. Next.js writes inline scripts to
 * hydrate a page; each one is stamped with this response's nonce, so no
 * script runs unless this server wrote it. 'strict-dynamic' lets those
 * scripts load Next's chunks without listing them.
 */
export function contentSecurityPolicy(nonce: string): string {
  if (!/^[A-Za-z0-9+/=_-]{16,}$/.test(nonce)) throw new Error("A nonce must be at least 16 base64 characters.");
  return [
    "default-src 'none'",
    `script-src 'nonce-${nonce}' 'strict-dynamic'`,
    `style-src 'self' 'nonce-${nonce}'`,
    "font-src 'self'",
    "img-src 'self' data:",
    "connect-src 'self'",
    "manifest-src 'self'",
    "base-uri 'none'",
    "form-action 'none'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests",
  ].join("; ");
}

/** 128 random bits, base64. */
export function newNonce(random: (bytes: Uint8Array) => Uint8Array = (b) => crypto.getRandomValues(b)): string {
  const bytes = random(new Uint8Array(16));
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}
