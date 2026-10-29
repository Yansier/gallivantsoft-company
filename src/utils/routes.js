export const languages = ['en', 'zh', 'ms'];
export const pageKeys = ['home', 'services', 'solutions', 'about', 'contact', 'privacy'];

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
