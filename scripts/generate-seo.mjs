import { readFile, writeFile, rm } from 'node:fs/promises';
import { resolve } from 'node:path';

const configSource = await readFile(resolve('src/config/site.js'), 'utf8');
const domain = configSource.match(/productionDomain:\s*['"]([^'"]*)['"]/)?.[1]?.replace(/\/$/, '') || '';
const sitemapPath = resolve('dist/sitemap.xml');

if (!domain) {
  await rm(sitemapPath, { force: true });
  console.log('SEO: productionDomain is empty; skipped absolute sitemap generation.');
  process.exit(0);
}

const routes = ['/', '/en/', '/zh/', '/ms/', '/privacy/', '/en/privacy/', '/zh/privacy/', '/ms/privacy/'];
const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${routes.map((path) => `  <url><loc>${domain}${path}</loc></url>`).join('\n')}\n</urlset>\n`;
await writeFile(sitemapPath, xml, 'utf8');
const robotsPath = resolve('dist/robots.txt');
const robots = await readFile(robotsPath, 'utf8');
await writeFile(robotsPath, `${robots.trim()}\nSitemap: ${domain}/sitemap.xml\n`, 'utf8');
console.log(`SEO: generated sitemap for ${domain}.`);
