import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// SITE_URL (for example https://luminara.example.org) is injected into the social-share tags.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const site = (process.env.SITE_URL || env.SITE_URL || '').replace(/\/$/, '');
  return {
    base: './',
    plugins: [
      react(),
      { name: 'site-url', transformIndexHtml: (html) => html.replaceAll('%SITE_URL%', site) },
    ],
    build: { chunkSizeWarningLimit: 1200 },
  };
});
