import { readFile, writeFile, rm, readdir } from 'node:fs/promises';
import { resolve, relative, sep } from 'node:path';

const configSource = await readFile(resolve('src/config/site.js'), 'utf8');
const domain = configSource.match(/productionDomain:\s*['"]([^'"]*)['"]/)?.[1]?.replace(/\/$/, '') || '';
const sitemapPath = resolve('dist/sitemap.xml');

async function findHtml(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map((entry) => {
    const path = resolve(directory, entry.name);
    return entry.isDirectory() ? findHtml(path) : entry.name.endsWith('.html') ? [path] : [];
  }));
  return nested.flat();
}

const distPath = resolve('dist');
const htmlFiles = await findHtml(distPath);
const routes = htmlFiles.map((file) => {
  const outputPath = relative(distPath, file).split(sep).join('/');
  if (outputPath === 'index.html') return '/';
  return `/${outputPath.replace(/index\.html$/, '')}`;
}).sort((a, b) => a === '/' ? -1 : b === '/' ? 1 : a.localeCompare(b));
if (!domain) {
  await rm(sitemapPath, { force: true });
  console.log(`SEO: discovered ${routes.length} routes from dist; productionDomain is empty, so absolute sitemap generation was skipped.`);
  process.exit(0);
}
const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${routes.map((path) => `  <url><loc>${domain}${path}</loc></url>`).join('\n')}\n</urlset>\n`;
await writeFile(sitemapPath, xml, 'utf8');
const robotsPath = resolve('dist/robots.txt');
const robots = await readFile(robotsPath, 'utf8');
await writeFile(robotsPath, `${robots.trim()}\nSitemap: ${domain}/sitemap.xml\n`, 'utf8');
console.log(`SEO: generated sitemap for ${domain} with ${routes.length} routes discovered from dist.`);
