import type { MetadataRoute } from 'next';
import { BLOCKED_CRAWLERS, PRIVATE_PREFIXES, SITE_URL } from '@/lib/crawlers';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: [...BLOCKED_CRAWLERS], disallow: '/' },
      { userAgent: '*', allow: '/', disallow: [...PRIVATE_PREFIXES] },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
