import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import tailwind from "@astrojs/tailwind";
import pagefind from "astro-pagefind";
import { passthroughImageService } from 'astro/config';

const site = process.env.SITE_URL;
const timeZone = process.env.TIME_ZONE || 'UTC';
const editorKey = process.env.EDITOR_KEY;
const apiUrl = process.env.API_URL;

export default defineConfig({
  output: 'static',
  adapter: cloudflare({
    imageService: 'noop',
    prerenderEnvironment: 'node'
  }),
  // Use memory driver for static site (no KV needed) — avoids SESSION binding messages
  session: { driver: 'memory' },
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
    tailwind(),
    pagefind()
  ],
  site: site,
});
