// The nightly drift feed: feed.json in the canary-data branch, written by
// canary/record.mjs. Everything in it is checked against the shape below
// before the page uses it; anything else is an error, never a guess.

export const FEED_URL = "https://raw.githubusercontent.com/mcpkeel/mcpkeel/canary-data/feed.json";
export const BRANCH_URL = "https://github.com/mcpkeel/mcpkeel/tree/canary-data";
export const DAY_URL = "https://github.com/mcpkeel/mcpkeel/blob/canary-data/history/";

export const SEVERITIES = ["critical", "high", "medium", "low"] as const;
export type Severity = (typeof SEVERITIES)[number];
export type SeverityCounts = Record<Severity, number>;

export interface FeedServer {
  name: string;
  status: string;
  version: string | null;
}

export interface FeedDay {
  date: string;
  changes: number;
  bySeverity: SeverityCounts;
  servers: string[];
}

export interface Feed {
  lastChecked: string;
  nights: string[];
  servers: FeedServer[];
  notChecked: string[];
  days: FeedDay[];
}

export interface FeedSummary {
  since: string;
  compared: number;
  driftNights: number;
  changes: number;
  totals: SeverityCounts;
  perServer: Map<string, number>;
}

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const NAME = /^[A-Za-z0-9_.@/-]{1,80}$/;

class FeedError extends Error {
  constructor(what: string) {
    super(`feed: ${what}`);
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);
const isDate = (value: unknown): value is string => typeof value === "string" && DATE.test(value);

function name(value: unknown): string {
  if (typeof value === "string" && NAME.test(value)) return value;
  throw new FeedError("name");
}

function count(value: unknown): number {
  if (typeof value === "number" && Number.isInteger(value) && value >= 0) return value;
  throw new FeedError("count");
}

/** The feed as the page needs it. Anything of the wrong shape throws. */
export function parseFeed(raw: unknown): Feed {
  if (!isRecord(raw)) throw new FeedError("not an object");
  if (!isDate(raw.lastChecked)) throw new FeedError("lastChecked");
  if (!Array.isArray(raw.nights) || !raw.nights.every(isDate)) throw new FeedError("nights");
  if (!Array.isArray(raw.servers) || !Array.isArray(raw.days)) throw new FeedError("servers or days");
  const notChecked = Array.isArray(raw.notChecked) ? raw.notChecked : [];
  return {
    lastChecked: raw.lastChecked,
    nights: [...raw.nights].sort(),
    servers: raw.servers.map((s: unknown) => {
      if (!isRecord(s)) throw new FeedError("server");
      return { name: name(s.name), status: name(s.status), version: s.version == null ? null : name(s.version) };
    }),
    notChecked: notChecked.map((s: unknown) => name(isRecord(s) ? s.server : undefined)),
    days: raw.days
      .map((d: unknown): FeedDay => {
        if (!isRecord(d) || !isDate(d.date)) throw new FeedError("day date");
        const by = isRecord(d.bySeverity) ? d.bySeverity : {};
        const bySeverity = Object.fromEntries(SEVERITIES.map((level) => [level, count(by[level] ?? 0)])) as SeverityCounts;
        const servers = Array.isArray(d.servers) ? d.servers.map(name) : [];
        return { date: d.date, changes: count(d.changes), bySeverity, servers };
      })
      .sort((a, b) => (a.date < b.date ? 1 : -1)),
  };
}

/** The numbers the page leads with. The first night only pins a baseline, so it is not a comparison. */
export function summarize(feed: Feed): FeedSummary {
  const compared = feed.nights.slice(1);
  const driftNights = new Set(feed.days.map((d) => d.date).filter((d) => compared.includes(d)));
  const totals: SeverityCounts = { critical: 0, high: 0, medium: 0, low: 0 };
  const perServer = new Map<string, number>();
  for (const day of feed.days) {
    if (!driftNights.has(day.date)) continue;
    for (const level of SEVERITIES) totals[level] += day.bySeverity[level];
    for (const server of day.servers) perServer.set(server, (perServer.get(server) ?? 0) + 1);
  }
  return {
    since: feed.nights[0] ?? feed.lastChecked,
    compared: compared.length,
    driftNights: driftNights.size,
    changes: SEVERITIES.reduce((n, level) => n + totals[level], 0),
    totals,
    perServer,
  };
}

/**
 * Read the feed. It is fetched where the page renders, on Cloudflare, so a
 * visitor's browser only talks to mcpkeel.app. A redirect is refused: Workers
 * support only "follow" and "manual", and with "manual" a 3xx is not ok.
 */
export async function loadFeed(fetcher: typeof fetch = fetch): Promise<Feed> {
  // On Workers, `cf.cacheTtl` keeps the feed in Cloudflare's cache for 15
  // minutes, so most visits do not reach GitHub. Elsewhere it is ignored.
  const init: RequestInit & { cf?: { cacheTtl: number; cacheEverything: boolean } } = {
    redirect: "manual",
    cf: { cacheTtl: 900, cacheEverything: true },
  };
  const response = await fetcher(FEED_URL, init);
  if (!response.ok) throw new FeedError(`HTTP ${response.status}`);
  return parseFeed(await response.json());
}
