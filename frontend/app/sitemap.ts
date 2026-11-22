import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/crawlers';

/** Public pages only: everything personal or role-gated is excluded (and disallowed in robots.txt). */
const PAGES: { path: string; changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency']; priority: number }[] = [
  { path: '/', changeFrequency: 'hourly', priority: 1 },
  { path: '/alerts', changeFrequency: 'hourly', priority: 0.9 },
  { path: '/disasters', changeFrequency: 'hourly', priority: 0.9 },
  { path: '/map', changeFrequency: 'hourly', priority: 0.8 },
  { path: '/resources', changeFrequency: 'daily', priority: 0.8 },
  { path: '/volunteer', changeFrequency: 'hourly', priority: 0.7 },
  { path: '/mesh', changeFrequency: 'weekly', priority: 0.7 },
  { path: '/knowledge', changeFrequency: 'monthly', priority: 0.7 },
  { path: '/safety', changeFrequency: 'monthly', priority: 0.6 },
  { path: '/analytics', changeFrequency: 'daily', priority: 0.5 },
  { path: '/transparency', changeFrequency: 'daily', priority: 0.5 },
  { path: '/predictions', changeFrequency: 'daily', priority: 0.4 },
  { path: '/disaster-intelligence', changeFrequency: 'daily', priority: 0.4 },
  { path: '/contact', changeFrequency: 'monthly', priority: 0.5 },
  { path: '/about', changeFrequency: 'monthly', priority: 0.4 },
  { path: '/research', changeFrequency: 'monthly', priority: 0.3 },
  { path: '/ngo-partners', changeFrequency: 'monthly', priority: 0.3 },
  { path: '/government', changeFrequency: 'monthly', priority: 0.3 },
  { path: '/faqs', changeFrequency: 'monthly', priority: 0.3 },
  { path: '/privacy', changeFrequency: 'yearly', priority: 0.2 },
  { path: '/terms', changeFrequency: 'yearly', priority: 0.2 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  return PAGES.map((p) => ({ url: `${SITE_URL}${p.path}`, changeFrequency: p.changeFrequency, priority: p.priority }));
}
