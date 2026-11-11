# mcpkeel.app

The website: a Next.js app (App Router, React, TypeScript) served by a Cloudflare Worker through [`@opennextjs/cloudflare`](https://opennext.js.org/cloudflare). It is its own npm project, apart from the CLI in the repository root.

| Path | What it is |
| --- | --- |
| `src/app/page.tsx` | The landing page, prerendered at build time. Its sections are in `src/components/landing/`. |
| `src/app/drift/page.tsx` | [`/drift`](https://mcpkeel.app/drift): the nightly drift feed, rendered per request from `feed.json` in the `canary-data` branch. |
| `src/app/privacy/page.tsx` | The privacy page. |
| `src/lib/feed.ts` | Reads the feed and checks its shape before anything is shown. |
| `worker.ts` | The Worker entry. It runs OpenNext's handler and adds the security headers, and on HTML a Content-Security-Policy with a nonce new for every response, stamped onto each `<script>` and `<style>`. |
| `src/lib/security.ts` | The headers and the policy, kept free of Workers APIs so they can be tested. |
| `public/_headers` | Headers for the static files the Worker never sees. |

## Develop

```sh
npm install
npm run dev          # next dev, at http://localhost:3000
npm run check        # eslint, tsc, vitest
npm run preview      # build for Workers and serve it locally in workerd
```

`npm run preview` is the one to trust before a deploy: it runs the real Worker, headers and CSP included. `npm run dev` does not run `worker.ts`.

## Deploy

```sh
npm run deploy       # opennextjs-cloudflare build && deploy
```

`wrangler.jsonc` attaches the Worker to `mcpkeel.app` and `www.mcpkeel.app`. Workers Builds builds a preview for every pull request with the same commands.

## Choices

- **No middleware.** OpenNext does not run Next.js's Node.js middleware, and a nonce set in middleware would make every page render per request. The nonce is added in `worker.ts` instead, so the landing and privacy pages stay prerendered.
- **No third parties.** Fonts are self-hosted with `next/font/local`; there is no analytics and no cookie. `/drift` fetches its data on Cloudflare, so a visitor's browser only talks to mcpkeel.app.
- **One stylesheet.** `src/app/globals.css` holds the design tokens and components; the design is small enough to read in one place.
