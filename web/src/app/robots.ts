import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // Nothing behind auth has SEO value, and dashboard pages are useless
      // to a crawler that can't sign in.
      disallow: ['/dashboard/', '/household-setup', '/auth/'],
    },
    sitemap: 'https://www.plateato.com/sitemap.xml',
  };
}
