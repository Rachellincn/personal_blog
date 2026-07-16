import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://www.rachellinxg-personal-blog.top',
  output: 'static',
  build: { format: 'file' },
  integrations: [sitemap()],
  markdown: {
    shikiConfig: { theme: 'github-light' },
  },
  vite: {
    build: { target: 'es2022' },
  },
});
