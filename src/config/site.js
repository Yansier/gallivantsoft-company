export const siteConfig = {
  companyName: 'GallivantSoft',
  subtitle: 'Software Engineering & Digital Solutions',
  country: 'Malaysia',
  phoneDisplay: '+60 17-727 6529',
  phoneRaw: '+60177276529',
  whatsappNumber: '60177276529',
  email: 'ledermanncaravetta968@gmail.com',
  productionDomain: '',
  defaultLanguage: 'en',
  supportedLanguages: ['en', 'zh', 'ms']
};

export const contactLinks = {
  phone: `tel:${siteConfig.phoneRaw}`,
  email: `mailto:${siteConfig.email}`,
  whatsapp: `https://wa.me/${siteConfig.whatsappNumber}`
};

export function whatsappLink(message) {
  return `${contactLinks.whatsapp}?text=${encodeURIComponent(message)}`;
}
