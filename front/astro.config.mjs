// @ts-check
import { defineConfig } from 'astro/config';

import react from '@astrojs/react';

import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  site: 'https://la-del-l.netlify.app',
  integrations: [
    react(),
    sitemap({
      filter: (page) => {
        const pathname = new URL(page).pathname;
        return (
          pathname === '/' ||
          pathname === '/ubicacion/' ||
          /^\/(categorias|products)\/\d+\/?$/.test(pathname)
        );
      }
    })
  ]
});