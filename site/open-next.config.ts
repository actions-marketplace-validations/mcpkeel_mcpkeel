import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import staticAssetsIncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/static-assets-incremental-cache";

// Every page but /drift is prerendered at build time and never revalidated,
// so the prerendered HTML is served from the Worker's static assets and no
// R2 bucket or KV namespace is needed. /drift is rendered per request.
export default defineCloudflareConfig({
  incrementalCache: staticAssetsIncrementalCache,
  enableCacheInterception: true,
});
