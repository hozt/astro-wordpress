# astro-wordpress

![HoZt] (<https://hoZt.com>)
![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)
![Astro](https://img.shields.io/badge/Astro-6.x-orange.svg)
![Cloudflare](https://img.shields.io/badge/Deployed%20on-Cloudflare-F38020.svg)

A headless CMS front-end built with [Astro 6](https://astro.build) that pulls content from a WordPress GraphQL API and deploys as a static site on Cloudflare Workers/Pages. It covers the full range of content types most sites need — posts, events, podcasts, galleries, portfolio, FAQs, contact forms, and more — all managed through WordPress and rendered at build time for maximum performance and SEO.

---

## Features

- **Content types** — Posts/Articles, Pages, Events, Podcasts, Galleries, Portfolio, FAQs, Testimonials, Videos, Private pages
- **Full-text search** — Client-side search powered by [Pagefind](https://pagefind.app)
- **Contact forms** — With [Cloudflare Turnstile](https://www.cloudflare.com/products/turnstile/) CAPTCHA and [Mailjet](https://www.mailjet.com) email delivery
- **RSS feeds** — Per content type, with Atom support
- **Sitemap** — Dynamically generated from CMS content with priority settings
- **SEO** — Canonical links, Open Graph, Twitter Cards, meta descriptions, JSON-LD structured data
- **Responsive images** — Pre-fetched from WordPress and served locally in WebP format
- **Multilingual menus** — Language-specific navigation via GraphQL
- **Admin edit links** — Quick links to the WordPress editor for authenticated users
- **Image lightbox** — Keyboard-navigable gallery lightbox
- **Calendar view** — Event calendar with day/month navigation
- **Password-protected pages** — Private page support with cookie-based auth
- **Rate limiting** — Built-in IP-based rate limiting for API endpoints

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | [Astro 6](https://astro.build) |
| Styling | [Tailwind CSS 3](https://tailwindcss.com) + SCSS |
| CMS | WordPress + [WPGraphQL](https://wpgraphql.com) |
| GraphQL client | [Apollo Client](https://apollographql.com/docs/react) |
| Deployment | [Cloudflare Workers/Pages](https://workers.cloudflare.com) |
| Search | [Pagefind](https://pagefind.app) |
| State | [Nanostores](https://github.com/nanostores/nanostores) |
| Icons | [Iconify](https://iconify.design) |
| Dates | [dayjs](https://day.js.org) |
| Image processing | [Sharp](https://sharp.pixelplumbing.com) |

---

## Prerequisites

- **Node.js** ≥ 20
- **npm** ≥ 10
- A **WordPress** site with:
  - [WPGraphQL](https://wpgraphql.com) plugin installed and enabled
  - Custom site settings fields (logo, favicon, default featured image, tagline) — see [WordPress Requirements](#wordpress-requirements) below
  - Optional custom post types for events, podcasts, gallery, portfolio, FAQs, testimonials, and videos

---

## Getting Started

```bash
# 1. Clone the repository
git clone https://github.com/hozt/hozt-astro.git
cd hozt-astro

# 2. Install dependencies
#    --legacy-peer-deps is required for astro-pagefind (pending Astro 6 support declaration)
npm install --legacy-peer-deps

# 3. Configure environment
cp .env.example .env
# Edit .env with your WordPress API URL and other settings

# 4. Fetch images from WordPress (optional for local dev)
npm run fetch

# 5. Start the development server
npm run dev
```

The dev server runs at `http://localhost:4321` by default.

---

## Environment Variables

Copy `.env.example` to `.env` and fill in the values:

| Variable | Required | Description |
|---|---|---|
| `SITE_URL` | Yes | Full URL of the deployed site (e.g. `https://example.com`). Used for canonical links, OG URLs, and sitemap. |
| `API_URL` | Yes | Base URL of your WordPress instance (e.g. `https://cms.example.com`). GraphQL endpoint is `{API_URL}/graphql`. Used by `npm run fetch` and injected into the Astro build. |
| `PUBLIC_API_URL` | No | Fallback for `API_URL` (some hosting setups prefer only `PUBLIC_*` vars). If both are set, `API_URL` wins. |
| `POST_ALIAS` | No | Set to `articles` to use `/articles/` routes instead of `/blog/`. Defaults to `blog`. |
| `BREADCRUMB_POSITION` | No | Position of breadcrumbs in page banner: `top`, `middle`, or `bottom`. Defaults to `middle`. |
| `PUBLIC_TURNSTILE_SITE_KEY` | No | Cloudflare Turnstile site key for contact form CAPTCHA. |
| `TURNSTILE_SECRET_KEY` | No | Cloudflare Turnstile secret key (server-side validation). |
| `EDITOR_KEY` | No | Secret key for admin edit mode. Sets a cookie to enable edit links to the WordPress dashboard. |
| `GA_ID` | No | Google Analytics / Tag Manager measurement ID. |
| `PUBLIC_GA_AD_CONVERSION_ID` | No | Google Ads conversion ID for form submission tracking. |
| `SITE_TITLE` | No | Fallback site title used in `<title>` tags. |
| `TIME_ZONE` | No | Timezone for date formatting (e.g. `America/Chicago`). Defaults to `UTC`. |
| `MAILJET_API_KEY` | No | Mailjet API key for contact form email delivery. |
| `MAILJET_API_SECRET` | No | Mailjet API secret. |
| `MAILJET_TO_EMAIL` | No | Email address that receives contact form submissions. |

---

## WordPress Requirements

### Required Plugin

- **[WPGraphQL](https://wpgraphql.com)** — Exposes WordPress content as a GraphQL API.

### Custom Site Settings

The theme expects a `customSiteSettings` GraphQL field providing:

| Field | Purpose |
|---|---|
| `logo` | Site logo (used in header and OG image fallback) |
| `faviconLogo` | Browser favicon |
| `defaultFeaturedImage` | Fallback image for posts without a featured image |
| `tagline` | Site tagline displayed on homepage |
| `footerMenu` | Footer navigation menu items |
| `socialMenu` | Social media links |

These are typically registered with [Advanced Custom Fields](https://www.advancedcustomfields.com) (ACF) or [CMB2](https://github.com/CMB2/CMB2) and exposed via a WPGraphQL extension.

### Optional Custom Post Types

Register these with a plugin like [Custom Post Type UI](https://wordpress.org/plugins/custom-post-type-ui/):

| Post Type | Slug | Used For |
|---|---|---|
| Events | `event` | Event listings and calendar |
| Podcasts | `podcast` | Podcast episode list with transcripts |
| Galleries | `gallery` | Image galleries with lightbox |
| Portfolio | `portfolio` | Portfolio project showcase |
| FAQs | `faq` | Accordion FAQ pages |
| Testimonials | `testimonial` | Testimonials section |
| Videos | `video` | Video embeds |

---

## Build & Deploy

### Development

```bash
npm run dev          # Start Astro dev server at http://localhost:4321
```

### Production Build

```bash
npm run fetch        # Download and optimize images from WordPress (run before first build)
npm run build        # Fetch images + Astro build + post-process editor CSS
npm run build-local  # Astro build only (skips image fetch — useful in CI with cached images)
```

### Preview (Cloudflare Worker)

```bash
npm run preview      # Runs wrangler dev against the built dist/ folder (http://localhost:8787)
```

### Deploy to Cloudflare

The Astro Cloudflare adapter splits the build into two directories:

| Directory | Contents |
|---|---|
| `dist/client/` | Static assets (HTML, CSS, JS, images, fonts) served by the Assets binding |
| `dist/server/` | Cloudflare Worker entry point (`entry.mjs`) and a generated `wrangler.json` |

The generated `dist/server/wrangler.json` is pre-configured with `"assets": {"directory": "../client"}`, so `wrangler deploy` automatically serves static files from `dist/client/` without any manual configuration.

**Deploy with Wrangler CLI:**

```bash
npm run build
cd dist/server
npx wrangler deploy
```

**Deploy with Cloudflare Dashboard (CI/CD):**

Connect the repository to [Cloudflare Pages](https://pages.cloudflare.com) and configure:

| Setting | Value |
|---|---|
| Build command | `npm run build` |
| Build output directory | `dist/client` |

> **Note:** Set all environment variables in the Cloudflare dashboard under **Workers & Pages → Settings → Environment Variables**.
>
> Cloudflare Pages variables are scoped per deployment environment. If you want Preview deployments to run `npm run fetch`, set `API_URL` for **Preview** as well as **Production**.
>
> By default, `npm run fetch` will **skip** (warn + exit 0) if `API_URL`/`PUBLIC_API_URL` is missing. Set `REQUIRE_API_URL=1` to fail the build when it’s missing. You can also set `SKIP_FETCH_IMAGES=1` to explicitly bypass the fetch step.

---

## Project Structure

```
hozt-astro/
├── src/
│   ├── layouts/          # HTML shell layout (Layout.astro)
│   ├── pages/            # File-based routes
│   │   ├── index.astro   # Homepage
│   │   ├── [...slug].astro  # Dynamic WordPress pages
│   │   ├── blog/         # Blog posts and pagination
│   │   ├── articles/     # Alternative to /blog/ (POST_ALIAS=articles)
│   │   ├── event/        # Events
│   │   ├── podcast/      # Podcasts
│   │   ├── gallery/      # Photo galleries
│   │   ├── portfolio/    # Portfolio
│   │   ├── faqs/         # FAQs
│   │   ├── private/      # Password-protected pages
│   │   ├── form/         # Dynamic contact forms
│   │   ├── api/          # Server API routes (contact form handler)
│   │   ├── sitemap.xml.js
│   │   ├── robots.txt.js
│   │   └── feed.xml.js
│   ├── components/       # Reusable Astro components
│   │   ├── Seo.astro     # Head meta tags, OG, Twitter Cards
│   │   ├── BannerTitle.astro
│   │   ├── Navigation.astro
│   │   ├── Gallery.astro
│   │   ├── ContactForm.astro
│   │   └── partials/     # Sub-components (RelatedPosts, etc.)
│   ├── componentsSite/   # Site-specific component overrides
│   │   ├── HeaderSite.astro
│   │   └── FooterSite.astro
│   ├── lib/              # Utilities and GraphQL client
│   │   ├── apolloClient.js
│   │   ├── queries.js    # All GraphQL query definitions
│   │   ├── utils.js      # HTML processing helpers
│   │   ├── fetchPosts.js
│   │   └── ...
│   ├── styles/           # SCSS stylesheets
│   └── store/            # Nanostores state management
├── public/               # Static assets (images, fonts, PDFs)
├── assets/               # Source images (pre-fetched from WordPress)
├── astro.config.mjs      # Astro configuration
├── tailwind.config.js    # Tailwind theme
├── postcss.config.js     # PostCSS pipeline
└── .env.example          # Environment variable template
```

---

## Customization

### Site-Specific Components

Override the header, footer, and homepage by placing components in `src/componentsSite/`:

| File | Purpose |
|---|---|
| `src/componentsSite/HeaderSite.astro` | Custom header |
| `src/componentsSite/FooterSite.astro` | Custom footer |
| `src/componentsSite/ContentBottom.astro` | Content injected below every page's `<main>` |
| `src/componentsSite/Copyright.astro` | Copyright bar in the footer |
| `src/componentsSite/index.astro` | Custom homepage component |

### Tailwind Theme

Edit `tailwind.config.js` to change the color palette, typography, breakpoints, or animations. Key custom values:

```js
theme: {
  extend: {
    colors: {
      primary: '#1c30aa',   // Main brand color
      secondary: '#5c5c5c', // Muted text/borders
      dark: '#1a1a1b',      // Dark backgrounds
    }
  }
}
```

### Post URL Alias

Set `POST_ALIAS=articles` in `.env` to use `/articles/[slug]` routes instead of `/blog/[slug]`. The redirect pages (`blog.astro` / `articles.astro`) automatically forward based on this setting.

---

## Content Routes Reference

| Route | Content Type |
|---|---|
| `/` | Homepage |
| `/[slug]` | WordPress pages (hierarchical) |
| `/blog/` or `/articles/` | Post archive (paginated) |
| `/blog/[slug]` | Individual post |
| `/event/` | Event list |
| `/calendar/` | Event calendar |
| `/event/[slug]` | Event detail |
| `/podcast/` | Podcast episode list |
| `/podcast/[slug]` | Podcast episode |
| `/podcast/transcript/[slug]` | Episode transcript |
| `/gallery/[slug]` | Photo gallery with lightbox |
| `/portfolio/` | Portfolio list |
| `/portfolio/[slug]` | Portfolio project |
| `/faqs/` | FAQ list |
| `/faqs/[slug]` | FAQ topic |
| `/tags/` | Tag cloud |
| `/tags/[slug]` | Posts by tag |
| `/category/[slug]` | Posts by category |
| `/search/` | Pagefind search UI |
| `/form/[slug]` | Dynamic contact form |
| `/private/[slug]` | Password-protected page |
| `/sitemap.xml` | XML sitemap |
| `/robots.txt` | Robots file |
| `/feed.xml` | RSS feed |

---

## Astro 6 Notes

### Tailwind CSS

`@astrojs/tailwind` does not support Astro 6. Tailwind is configured directly via PostCSS (`postcss.config.js`). The `@tailwind` directives are imported in `src/styles/style.scss`.

### Pagefind

`astro-pagefind` has not declared Astro 6 peer support yet. Install with:

```bash
npm install --legacy-peer-deps
```

### Image Optimization

Astro's built-in image optimizer is disabled (`passthroughImageService`) because images are pre-fetched and optimized by `fetchAndSaveImages.js` using Sharp during the `npm run fetch` step. Locally optimized WebP images are stored in `public/images/content/`.

---

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature-name`
3. Make your changes
4. Ensure the build succeeds: `npm run build-local`
5. Submit a pull request describing what changed and why

Please keep PRs focused — one feature or fix per PR. Open an issue first for significant changes.

---

## License

[MIT](LICENSE)
