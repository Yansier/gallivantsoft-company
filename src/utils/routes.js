export const languages = ['en', 'zh', 'ms'];
export const pageKeys = ['home', 'services', 'solutions', 'showcase', 'about', 'contact', 'privacy'];

export function routeFor(lang = 'en', page = 'home') {
  const language = languages.includes(lang) ? lang : 'en';
  return page === 'home' ? `/${language}/` : `/${language}/${page}/`;
}

export function rootRouteFor(page = 'home') {
  if (page === 'home') return '/';
  if (page === 'privacy') return '/privacy/';
  return routeFor('en', page);
}

export function languageAlternates(page = 'home') {
  return Object.fromEntries(languages.map((lang) => [lang, routeFor(lang, page)]));
}

export function localizedPath(pathname = '/', lang = 'en') {
  const language = languages.includes(lang) ? lang : 'en';
  const segments = pathname.split('/').filter(Boolean);
  if (languages.includes(segments[0])) segments[0] = language;
  else segments.unshift(language);
  return `/${segments.join('/')}/`;
}
