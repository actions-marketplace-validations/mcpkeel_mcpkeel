import { describe, expect, it } from "vitest";
import { BASE_HEADERS, contentSecurityPolicy, newNonce } from "./security";

describe("contentSecurityPolicy", () => {
  const policy = contentSecurityPolicy("abcdefghijklmnop0123==");

  it("allows only scripts carrying this response's nonce", () => {
    expect(policy).toContain("script-src 'nonce-abcdefghijklmnop0123==' 'strict-dynamic'");
    expect(policy).not.toMatch(/unsafe-inline|unsafe-eval/);
  });

  it("denies everything by default, and framing, forms and base URLs outright", () => {
    for (const directive of ["default-src 'none'", "frame-ancestors 'none'", "form-action 'none'", "base-uri 'none'"]) {
      expect(policy).toContain(directive);
    }
  });

  it("refuses a nonce too short to be unguessable", () => {
    expect(() => contentSecurityPolicy("short")).toThrow();
    expect(() => contentSecurityPolicy("a b c d e f g h i j")).toThrow();
  });
});

describe("newNonce", () => {
  it("is 128 bits of base64, and different every time", () => {
    const a = newNonce();
    expect(atob(a)).toHaveLength(16);
    expect(newNonce()).not.toBe(a);
  });
});

describe("BASE_HEADERS", () => {
  it("covers sniffing, framing, referrers, HSTS and browser features", () => {
    expect(Object.keys(BASE_HEADERS)).toEqual(
      expect.arrayContaining(["X-Content-Type-Options", "X-Frame-Options", "Referrer-Policy", "Strict-Transport-Security", "Permissions-Policy"]),
    );
  });
});
