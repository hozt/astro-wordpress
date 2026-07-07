/**
 * @file astro.config.mjs
 * @description Astro build configuration: static output mode, Pagefind search integration,
 *   SCSS modern compiler, and build-time env variable injection.
 *
 *   Image service is set to passthrough because images are pre-fetched and optimized
 *   by fetchAndSaveImages.js (using Sharp) during `npm run fetch`. Astro's built-in
 *   image optimizer is not needed — the locally cached WebP files are served directly.
 *
 *   SSR endpoints (admin-menu, instagram, api/contact) are handled by Cloudflare Pages
 *   Functions in the `functions/` directory — no adapter needed.
 */
import { defineConfig } from 'astro/config';
import pagefind from "astro-pagefind";
import { passthroughImageService } from 'astro/config';

const site = process.env.SITE_URL;
const timeZone = process.env.TIME_ZONE || 'UTC';
const editorKey = process.env.EDITOR_KEY;
const apiUrl = process.env.API_URL;

export default defineConfig({
  output: 'static',
  image: {
    service: passthroughImageService()
  },
  vite: {
    ssr: {
      external: ['sharp']
    },
    css: {
      preprocessorOptions: {
        scss: {
          api: "modern-compiler"
        }
      }
    },
    resolve: {
      preserveSymlinks: true
    },
    define: {
      'import.meta.env.TIME_ZONE': JSON.stringify(timeZone),
      'import.meta.env.EDITOR_KEY': JSON.stringify(editorKey),
      'import.meta.env.API_URL': JSON.stringify(apiUrl)
    }
  },
  integrations: [
    pagefind()
  ],
  site: site,
});
