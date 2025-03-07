import { defineConfig } from 'vite';
import tailwind from "@astrojs/tailwind";
import pagefind from "astro-pagefind";
import compressor from "astro-compressor";

const site = process.env.SITE_URL;
const timeZone = process.env.TIME_ZONE || 'UTC';

export default defineConfig({
  output: 'static',
  vite: {
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
    compressor({
      fileExtensions: [".html"]
    }),
    tailwind(),
    pagefind()
  ],
  site: site,
});
