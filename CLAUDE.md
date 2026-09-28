# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

`hozt-astro` ("astro-wordpress") is an Astro 6 headless front-end that pulls content from a WordPress GraphQL API (WPGraphQL) and deploys as a static site + Cloudflare Pages Functions. Full feature list, env vars, WordPress requirements, and route table are in [README.md](README.md) — read it before assuming behavior; don't duplicate it here.

## This is the upstream template — not a one-off site

This repo is the shared base that client sites fork from (see the README's "Contributing" section for the fork → PR-back workflow). The working tree here is *also* a live site instance (`wrangler.toml` name `astro-wp`), which is why `.gitignore` deliberately excludes the site-specific layer even though those files exist on disk:

- `src/componentsSite/*` (header/footer/homepage overrides)
- `tailwind.config.js`
- `src/styles/site.scss`, `src/styles/fonts.scss`
- `.env`, `public/images/*`, `assets/*`, `public/pdfs/*`

**Implication:** editing any of those files is invisible to `git status` and will never be committed here — that's intentional, not a bug. When changing something that should benefit every downstream fork (a component in `src/components/`, a `src/lib/` helper, a content-type page under `src/pages/`), make sure the change stays generic — no hardcoded branding, copy, or client-specific IDs. Anything client-specific belongs in the gitignored site layer above, not in the tracked upstream code.

## Commands

```bash
npm install                      # astro-pagefind >=1.8.6 declares Astro 6 peer support; no legacy-peer-deps flag needed
npm run dev                      # astro dev, http://localhost:4321
npm run fetch                    # pull + Sharp-optimize images from WordPress into public/images/
npm run build                    # fetch + astro build + editor-css.js post-process
npm run build-local              # astro build only, skips fetch (use when images are already cached, e.g. CI)
npm run preview                  # wrangler dev against dist/, http://localhost:8787
npm run clean                    # rm -rf dist .astro node_modules/.vite assets
```

No lint/typecheck script is defined in `package.json`; `tsconfig.json` extends `astro/tsconfigs/strict`, so use `npx astro check` directly if you need to verify types.

## Architecture

- **Data source**: `src/lib/apolloClient.js` + `src/lib/queries.js` — all WordPress content comes through WPGraphQL via Apollo Client. `src/lib/fetchPosts.js`, `fetchAllResults.js`, `fetchSiteSettings.js` wrap common query patterns; check here before writing a new GraphQL fetch.
- **Images are not handled by Astro's image optimizer.** `astro.config.mjs` sets `passthroughImageService()` deliberately — `npm run fetch` (`fetchAndSaveImages.js`, using Sharp) pre-downloads and converts WordPress images to local WebP under `public/images/`. Build-time image work belongs in that script, not in `.astro` component `<Image>` usage.
- **Static output + Cloudflare Pages Functions for SSR pieces.** `output: 'static'` in `astro.config.mjs`; anything needing runtime logic (admin menu, Instagram embed, contact form) lives in `functions/*.ts` as Cloudflare Pages Functions, not Astro API routes — except `src/functions/private-login.js`, which backs the password-protected `/private/` pages and does run inside Astro's SSR-at-build boundary. Don't confuse the two `functions` directories.
- **Deploy output is split**: `dist/client/` (static assets) + `dist/server/` (Worker entry + generated `wrangler.json` pointing at `../client`). This split is produced by the Cloudflare adapter — see README's Build & Deploy section for the two deploy paths (Wrangler CLI vs Cloudflare dashboard CI).
- **WordPress HTML is rendered raw, and that is deliberate.** ~25 components/pages use `set:html` on WPGraphQL `content` with no sanitization step. WordPress is an authenticated CMS — anyone able to inject markup there already has full control of the site — and sanitizers like `rehype-sanitize` strip the iframes, embeds and inline styles that WP content legitimately relies on (see `VideoPlayer.astro`, `CustomJs.astro`, `Gallery.astro`). Don't add a blanket sanitize pass without retesting those. A dead `src/utils/processHtml.js` used to exist for this and was removed: it was never imported, and it depended on `unified`/`rehype-parse`/`rehype-stringify`/`rehype-raw` which were never in `package.json`.
- **Build-time env vars do NOT need a `vite.define` entry.** Astro loads the entire build-process environment into `import.meta.env` (it calls Vite's `loadEnv` with an empty prefix — see `node_modules/astro/dist/env/env-loader.js`), so any variable present when `astro build` runs is already readable as `import.meta.env.FOO`. Cloudflare Pages injects dashboard variables into both the build and the Worker runtime, so setting one in the dashboard is sufficient. **Do not put site-specific values like `API_URL` in committed `wrangler.toml` `[vars]`** — forks merge that file and would build against the wrong WordPress. Use the Pages dashboard (and local `.env` / `.dev.vars`) instead. Keep `.env.example` in sync — it is the only inventory of what a fork must set. Note also that only `PUBLIC_*` vars reach the browser; reading a non-`PUBLIC_` var inside a `<script>` tag yields `undefined`.
- **Site-specific override points**: `src/componentsSite/{HeaderSite,FooterSite,ContentBottom,Copyright,index}.astro` — these are the files a fork is expected to replace; core `src/components/` and `src/layouts/` should reference/slot them in, not special-case a site.

## Astro 6 gotchas (already hit in this repo)

- `@astrojs/tailwind` does not support Astro 6 — Tailwind runs through plain PostCSS (`postcss.config.js`), imported via `@tailwind` directives in the (gitignored, per-site) `src/styles/site.scss`.
- Cloudflare's `cloudflare:workers` env binding pattern changed in Astro 6 — see `functions/api/contact.ts` for the current working form if adding another Function that needs runtime env vars.

## Recommendations for Astro projects generally

Not specific to a problem found in this repo — general conventions worth holding to when writing or reviewing Astro code here or elsewhere:

- **Default to zero client JS.** Astro components render to static HTML by default; only reach for `client:*` directives (`client:load`, `client:visible`, etc.) on the specific interactive island that needs it, and prefer `client:visible`/`client:idle` over `client:load` for anything below the fold.
- **Prefer `.astro` components over framework components** (React/Vue/Svelte/Preact) unless you need client-side state or lifecycle — this repo currently has no UI framework integration installed, so introducing one is a real dependency/bundle-size decision, not a free reach.
- **Use `astro:content` collections for structured local content** (if this project ever grows content that isn't WordPress-sourced — e.g. changelogs, docs) rather than ad hoc frontmatter parsing; it gives you schema validation and typed queries for free.
- **Keep data-fetching colocated with the route that needs it** (`getStaticPaths`, top-of-file `await` in `.astro` files) rather than duplicating a GraphQL query across pages — this repo's `src/lib/fetchPosts.js`-style wrappers are the right pattern; extend that file rather than inlining new Apollo calls in a page.
- **Run `astro check` in CI**, not just `astro build` — static builds can succeed with type errors that only surface at runtime since Astro doesn't fail the build on TS errors by default.
- **Be deliberate about `output: 'static'` vs `'server'`/hybrid** — this repo is fully static plus out-of-band Cloudflare Functions; if a future page needs true per-request SSR inside Astro itself (not a separate Function), that's a mode change with build/deploy implications, not just a route-level tweak.
