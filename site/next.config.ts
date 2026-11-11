import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

// site/ is its own npm project inside the CLI's repository; without this,
// Next.js takes the repository root, with the CLI's lockfile, as the workspace.
const root = fileURLToPath(new URL(".", import.meta.url));

const nextConfig: NextConfig = {
  turbopack: { root },
  outputFileTracingRoot: root,
  reactStrictMode: true,
  // No "X-Powered-By: Next.js": the stack is not the visitor's business.
  poweredByHeader: false,
  // Plain pages with nothing to optimize; images are SVG or the OG card.
  images: { unoptimized: true },
  typedRoutes: true,
};

export default nextConfig;

// Lets `next dev` reach Cloudflare bindings, as `opennextjs-cloudflare` does in production.
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
void initOpenNextCloudflareForDev();
