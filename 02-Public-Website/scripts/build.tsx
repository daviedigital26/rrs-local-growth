/**
 * Static site build: React SSR → dist/. Run: npm run build:site
 * Emits HTML per route, hashed CSS/JS, public assets, sitemap.xml, robots.txt, _headers.
 */
import { createHash } from 'node:crypto';
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderToStaticMarkup } from 'react-dom/server';
import { transformSync } from 'esbuild';
import { config } from '../site.config.ts';
import { assets, Document } from '../src/components/layout.tsx';
import { absolute } from '../src/lib/seo.tsx';
import { routes } from '../src/routes.tsx';

const web = join(dirname(fileURLToPath(import.meta.url)), '..');
const root = join(web, '..');
/** RRS_DIST_DIR lets QA build a second, differently configured copy (e.g. dist-connected). */
const dist = join(web, process.env.RRS_DIST_DIR ?? 'dist');
const t0 = Date.now();

rmSync(dist, { recursive: true, force: true });
mkdirSync(dist, { recursive: true });
cpSync(join(web, 'public'), dist, { recursive: true });
// Fictional sample exports → /downloads/ (served as files; see sample report page)
cpSync(join(root, '17-Sample-Clients/exports'), join(dist, 'downloads'), { recursive: true, filter: (f) => !f.endsWith('.manifest.json') });

const hash = (s: string) => createHash('sha256').update(s).digest('hex').slice(0, 10);

// CSS: generated tokens + site styles → one hashed file
const cssSource = readFileSync(join(root, '01-Brand-System/Design-Tokens/tokens.css'), 'utf8') + '\n' + readFileSync(join(web, 'src/styles/site.css'), 'utf8');
const css = transformSync(cssSource, { loader: 'css', minify: true, target: ['chrome100', 'safari15', 'firefox100'] }).code;
const cssName = `site.${hash(css)}.css`;
mkdirSync(join(dist, 'css'), { recursive: true });
writeFileSync(join(dist, 'css', cssName), css);
assets.css = `/css/${cssName}`;

// JS: hashed copy of public/js/site.js
const jsSource = readFileSync(join(web, 'public/js/site.js'), 'utf8');
const js = transformSync(jsSource, { loader: 'js', minify: true, target: ['es2018'] }).code;
const jsName = `site.${hash(js)}.js`;
writeFileSync(join(dist, 'js', jsName), js);
rmSync(join(dist, 'js', 'site.js'));
assets.js = `/js/${jsName}`;

// Pages
const seen = new Set<string>();
const sizes: Array<[string, number]> = [];
for (const r of routes) {
  if (seen.has(r.meta.path)) throw new Error(`Duplicate route ${r.meta.path}`);
  seen.add(r.meta.path);
  const html = '<!doctype html>' + renderToStaticMarkup(<Document meta={r.meta} bodyClass={r.bodyClass}>{r.render()}</Document>);
  const file = r.meta.path.endsWith('.html') ? join(dist, r.meta.path) : join(dist, r.meta.path, 'index.html');
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, html);
  sizes.push([r.meta.path, Buffer.byteLength(html)]);
}

// sitemap + robots
const today = new Date().toISOString().slice(0, 10);
const indexable = routes.filter((r) => !r.meta.noindex && !r.meta.path.endsWith('.html'));
writeFileSync(
  join(dist, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${indexable.map((r) => `  <url><loc>${absolute(r.meta.path)}</loc><lastmod>${today}</lastmod></url>`).join('\n')}\n</urlset>\n`,
);
writeFileSync(
  join(dist, 'robots.txt'),
  config.isPreview
    ? '# Preview build: indexing disabled until an approved domain is configured (SITE_URL).\nUser-agent: *\nDisallow: /\n'
    : `User-agent: *\nAllow: /\n\nSitemap: ${absolute('/sitemap.xml')}\n`,
);

// Security headers (Netlify / Cloudflare Pages format; harmless elsewhere)
const connect = ["'self'", config.formEndpoint && new URL(config.formEndpoint).origin, config.errorEndpoint && new URL(config.errorEndpoint).origin, config.analytics.provider === 'plausible' && 'https://plausible.io', config.analytics.provider === 'ga4' && 'https://*.google-analytics.com'].filter(Boolean).join(' ');
const scriptSrc = ["'self'", "'sha256-" + createHash('sha256').update("document.documentElement.classList.replace('no-js','js')").digest('base64') + "'", config.analytics.provider === 'plausible' && 'https://plausible.io', config.analytics.provider === 'ga4' && 'https://www.googletagmanager.com'].filter(Boolean).join(' ');
writeFileSync(
  join(dist, '_headers'),
  `/*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n  X-Frame-Options: DENY\n  Permissions-Policy: camera=(), microphone=(), geolocation=()\n  Content-Security-Policy: default-src 'self'; script-src ${scriptSrc}; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src ${connect}; form-action 'self'${config.formEndpoint ? ' ' + new URL(config.formEndpoint).origin : ''}; frame-ancestors 'none'; base-uri 'self'\n/fonts/*\n  Cache-Control: public, max-age=31536000, immutable\n/css/*\n  Cache-Control: public, max-age=31536000, immutable\n/js/*\n  Cache-Control: public, max-age=31536000, immutable\n`,
);

const total = sizes.reduce((s, [, b]) => s + b, 0);
console.log(`site: ${sizes.length} pages, ${(total / 1024).toFixed(0)} KB HTML, css ${(css.length / 1024).toFixed(1)} KB, js ${(js.length / 1024).toFixed(1)} KB → dist/ in ${Date.now() - t0} ms${config.isPreview ? ' (preview: noindex)' : ''}`);
const big = sizes.filter(([, b]) => b > 60 * 1024);
if (big.length) console.warn(`warning: pages over 60 KB budget: ${big.map(([p, b]) => `${p} ${(b / 1024).toFixed(0)}KB`).join(', ')}`);
