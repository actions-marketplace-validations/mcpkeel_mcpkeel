import { describe, expect, it } from "vitest";
import { FEED_URL, loadFeed, parseFeed, summarize } from "./feed";

const FEED = {
  lastChecked: "2026-11-10",
  nights: ["2026-11-07", "2026-11-08", "2026-11-09", "2026-11-10"],
  servers: [
    { name: "context7", status: "ok", version: "4.6.0" },
    { name: "playwright", status: "drift", version: "1.66.0" },
  ],
  notChecked: [],
  days: [
    { date: "2026-11-09", changes: 2, bySeverity: { critical: 0, high: 1, medium: 0, low: 1 }, servers: ["context7"] },
    { date: "2026-11-10", changes: 3, bySeverity: { critical: 0, high: 2, medium: 0, low: 1 }, servers: ["playwright"] },
  ],
};

describe("summarize", () => {
  it("counts compared nights, not the baseline night", () => {
    const s = summarize(parseFeed(FEED));
    expect(s.since).toBe("2026-11-07");
    expect(s.compared).toBe(3);
    expect(s.driftNights).toBe(2);
    expect(s.changes).toBe(5);
    expect(s.totals).toEqual({ critical: 0, high: 3, medium: 0, low: 2 });
    expect(s.perServer.get("context7")).toBe(1);
  });
});

describe("parseFeed", () => {
  it("orders nights oldest first and days newest first", () => {
    const feed = parseFeed({ ...FEED, nights: [...FEED.nights].reverse() });
    expect(feed.nights[0]).toBe("2026-11-07");
    expect(feed.days[0]?.date).toBe("2026-11-10");
  });

  it.each([
    ["not an object", null],
    ["a bad date", { ...FEED, lastChecked: "yesterday" }],
    ["markup in a name", { ...FEED, servers: [{ name: "<script>alert(1)</script>", status: "ok" }] }],
    ["a negative count", { ...FEED, days: [{ ...FEED.days[0], changes: -1 }] }],
    ["markup in a date", { ...FEED, days: [{ ...FEED.days[0], date: '2026-11-09"><img>' }] }],
  ])("refuses %s", (_, raw) => {
    expect(() => parseFeed(raw)).toThrow(/^feed:/);
  });
});

describe("loadFeed", () => {
  it("never follows a redirect, which Workers would refuse to be asked for anyway", async () => {
    const calls: RequestInit[] = [];
    const fetcher = (async (url: string, init: RequestInit) => {
      expect(url).toBe(FEED_URL);
      calls.push(init);
      return new Response(JSON.stringify(FEED));
    }) as unknown as typeof fetch;
    await loadFeed(fetcher);
    expect(calls[0]?.redirect).toBe("manual");
  });

  it("treats a redirect or an error status as a failure", async () => {
    const redirect = (async () => new Response(null, { status: 302, headers: { location: "https://example.com" } })) as unknown as typeof fetch;
    await expect(loadFeed(redirect)).rejects.toThrow(/HTTP 302/);
    const down = (async () => new Response("", { status: 503 })) as unknown as typeof fetch;
    await expect(loadFeed(down)).rejects.toThrow(/HTTP 503/);
  });
});
