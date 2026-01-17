import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import tailwind from "@astrojs/tailwind";
import pagefind from "astro-pagefind";
import { passthroughImageService } from 'astro/config';

const site = process.env.SITE_URL;
const timeZone = process.env.TIME_ZONE || 'UTC';

export default defineConfig({
  output: 'static',
  adapter: cloudflare({
    imageService: 'noop'
  }),
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
      'import.meta.env.TIME_ZONE': JSON.stringify(timeZone)
    }
  },
  integrations: [
    tailwind(),
    pagefind()
  ],
  site: site,
});
