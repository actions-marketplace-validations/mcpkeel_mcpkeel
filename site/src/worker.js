// mcpkeel.app: static assets, plus /drift, the nightly drift feed.
//
// /drift is rendered from feed.json in the canary-data branch, which the
// nightly canary rewrites. The fetch happens on Cloudflare, so a visitor's
// browser only ever talks to mcpkeel.app. See feed.js for how the feed is
// checked and rendered. This module exports only the handler: the Workers
// runtime treats every export as an entrypoint.
import { FEED_URL, html, parseFeed, renderDrift, renderUnavailable } from "./feed.js";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname !== "/drift" && url.pathname !== "/drift/") return env.ASSETS.fetch(request);
    if (request.method !== "GET" && request.method !== "HEAD") return new Response("Method not allowed", { status: 405, headers: { Allow: "GET, HEAD" } });

    let feed;
    try {
      // Workers support only "follow" and "manual". With "manual" a redirect
      // comes back as a 3xx, which is not ok, so it is refused below.
      const response = await fetch(FEED_URL, { cf: { cacheTtl: 900, cacheEverything: true }, redirect: "manual" });
      if (!response.ok) throw new Error(`feed: HTTP ${response.status}`);
      feed = parseFeed(await response.json());
    } catch (error) {
      console.error(String(error));
      return html(renderUnavailable(), 503, "no-store");
    }
    return html(renderDrift(feed), 200, "public, max-age=900");
  },
};
