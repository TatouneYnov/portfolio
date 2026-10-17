// Content-Security-Policy partagée entre la balise <meta> (GitHub Pages) et le fichier _headers
// (Cloudflare Pages / Netlify). frame-ancestors et upgrade-insecure-requests ne fonctionnent
// qu'en en-tête HTTP : ils ne sont ajoutés que dans _headers.
export const FORM_ORIGIN = 'https://api.web3forms.com';

export function buildCsp({ meta = false } = {}) {
  const directives = [
    "default-src 'self'",
    "script-src 'self' 'wasm-unsafe-eval'",
    "style-src 'self'",
    "font-src 'self'",
    "img-src 'self' data: blob:",
    `connect-src 'self' ${FORM_ORIGIN}`,
    `form-action 'self' ${FORM_ORIGIN}`,
    "worker-src 'self' blob:",
    "base-uri 'self'",
    "object-src 'none'",
  ];
  if (!meta) directives.push("frame-ancestors 'none'", 'upgrade-insecure-requests');
  return directives.join('; ');
}
