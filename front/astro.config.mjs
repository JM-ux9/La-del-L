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
      generateSW: {
        navigateFallback: null,
        globPatterns: ['**/*.{css,js,html,svg,png,jpg,jpeg,webp,ico,txt,woff2}'],
        globIgnores: [
          '**/pwa-*.png',
          '**/maskable-icon-*.png',
          '**/apple-touch-icon*.png',
        ],
        ignoreURLParametersMatching: [/.*/],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/uofaxfmbilrtjorblprt\.supabase\.co\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'supabase-images-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 30,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
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