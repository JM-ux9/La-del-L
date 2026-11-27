import { defineConfig } from 'astro/config';
import { AstroPWAIntegration } from '@vite-pwa/astro';
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
      },
    }),
    AstroPWAIntegration({
      registerType: 'autoUpdate',
      includeAssets: ['images/apple-touch-icon-180x180.png'],
      manifest: {
        name: 'La del L',
        short_name: 'La del L',
        description: 'Tienda en línea de la Cafetería del Edificio L',
        theme_color: '#FFF8E7',
        background_color: '#FFF8E7',
        display: 'standalone',
        start_url: '/login',
        icons: [
          {
            src: 'images/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'images/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'images/maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      strategies: 'buildSW',
      buildSW: {
        swSrc: 'src/sw.js',
        globPatterns: [
          'index.html',
          'offline.html',
          'producto-offline/index.html',
          'productos.json',
          '_astro/**/*.{js,css}',
          'images/*.{png,ico}',
          '*.{ico,svg,png}',
        ],
      },
    }),
  ],
  build: {
    inlineStylesheets: 'always',
  },
  image: {
    domains: ['uofaxfmbilrtjorblprt.supabase.co'],
  },
});