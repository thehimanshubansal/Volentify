import type { Metadata, Viewport } from 'next';
import { Analytics } from '@vercel/analytics/next';
import './globals.css';
import Navbar from '@/components/layout/Navbar';
import { ToastProvider } from '@/components/ui/Toast';
import { SessionProvider } from '@/lib/session';

export const metadata: Metadata = {
  title: { default: 'Volentify — Disaster intelligence for India', template: '%s · Volentify' },
  description:
    'Live incident mapping, offline mesh field reports, hazard forecasting and volunteer dispatch for India’s disaster responders.',
  applicationName: 'Volentify',
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://volentify.vercel.app'),
  openGraph: {
    siteName: 'Volentify', type: 'website',
    images: [{ url: '/brand/volentify-logo-on-dark-1200.png', width: 1200, height: 630, alt: 'Volentify' }],
  },
};

export const viewport: Viewport = { themeColor: '#07080a', width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=Instrument+Serif:ital@0;1&family=Inter:wght@300;400;500;600&display=swap"
        />
      </head>
      <body className="flex min-h-screen flex-col">
        <SessionProvider>
          <ToastProvider>
            <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[200] focus:rounded-lg focus:bg-signal focus:px-3 focus:py-2 focus:text-ink">
              Skip to content
            </a>
            <Navbar />
            <div id="main" className="flex flex-1 flex-col">{children}</div>
          </ToastProvider>
        </SessionProvider>
        <Analytics />
      </body>
    </html>
  );
}
