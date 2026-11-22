/**
 * Who may crawl Volentify. Search engines may index the public safety pages (people need to find alerts and
 * shelters); AI-training crawlers and bulk SEO scrapers may not crawl anything. robots.txt asks politely
 * (app/robots.ts); middleware.ts and the API's request guard refuse these agents outright.
 */
export const BLOCKED_CRAWLERS = [
  'GPTBot', 'CCBot', 'ClaudeBot', 'anthropic-ai', 'Google-Extended', 'Applebot-Extended', 'Bytespider', 'Amazonbot',
  'meta-externalagent', 'FacebookBot', 'Diffbot', 'cohere-ai', 'Omgilibot', 'ImagesiftBot', 'AhrefsBot', 'SemrushBot',
  'MJ12bot', 'DotBot', 'PetalBot', 'DataForSeoBot', 'BLEXBot', 'Scrapy', 'HTTrack',
] as const;

/** Vulnerability scanners and brute-force tools; never legitimate visitors. */
export const SCANNERS = [
  'sqlmap', 'nikto', 'nmap', 'masscan', 'zgrab', 'nuclei', 'wpscan', 'dirbuster', 'gobuster', 'ffuf', 'feroxbuster',
  'acunetix', 'netsparker', 'havij', 'w3af', 'hydra', 'jorgee', 'openvas', 'nessus', 'arachni', 'skipfish', 'commix',
] as const;

/** Pages that are personal or role-gated: never indexed, never listed in the sitemap. */
export const PRIVATE_PREFIXES = ['/api/', '/admin', '/agency', '/dashboard', '/onboarding', '/profile', '/volunteers/',
  '/auth/', '/login', '/register'] as const;

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://volentify.vercel.app').replace(/\/$/, '');
