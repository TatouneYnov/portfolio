import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import Icons from 'unplugin-icons/vite';
import { buildCsp } from './scripts/csp.mjs';
import { frTypo } from './scripts/typo.mjs';

const DEFAULT_SITE_URL = 'https://ethanbacquier.github.io';

/**
 * Remplace les jetons __SITE_URL__ / __BASE__ dans index.html
 * et ajoute la CSP en <meta> au build uniquement (le serveur de dev a besoin de scripts inline).
 */
function siteMeta(siteUrl: string, base: string): Plugin {
  return {
    name: 'site-meta',
    transformIndexHtml: {
      order: 'pre',
      handler(html, ctx) {
        let out = html.replaceAll('__SITE_URL__', siteUrl.replace(/\/$/, '')).replaceAll('__BASE__', base);
        if (!ctx.server) {
          out = out.replace(
            '<!--csp-->',
            `<meta http-equiv="Content-Security-Policy" content="${buildCsp({ meta: true })}">`,
          );
        } else {
          out = out.replace('<!--csp-->', '');
        }
        return out;
      },
    },
  };
}

/** Espaces insécables de la typographie française dans les textes du site (src/data/*.json) */
function frenchTypography(): Plugin {
  return {
    name: 'french-typography',
    enforce: 'pre',
    transform(code, id) {
      if (!/[\\/]src[\\/]data[\\/][^\\/]+\.json$/.test(id)) return null;
      return { code: frTypo(code), map: null };
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  const base = env.VITE_BASE || '/';
  const siteUrl = env.VITE_SITE_URL || DEFAULT_SITE_URL;
  return {
    base,
    plugins: [frenchTypography(), react(), Icons({ compiler: 'jsx', jsx: 'react' }), siteMeta(siteUrl, base)],
    define: {
      __SITE_URL__: JSON.stringify(siteUrl.replace(/\/$/, '')),
    },
    build: {
      sourcemap: false,
      modulePreload: { polyfill: false },
      assetsInlineLimit: 0,
      chunkSizeWarningLimit: 1600,
    },
    ssr: {
      noExternal: ['gsap', 'lenis'],
    },
  };
});
