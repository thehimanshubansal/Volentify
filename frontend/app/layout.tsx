import type { Metadata } from 'next';
import './globals.css';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';

export const metadata: Metadata = {
  title: 'Volentify — Humanitarian Disaster Intelligence Platform',
  description:
    'National-scale GIS disaster intelligence, real-time satellite tracking, machine learning hazard forecasting, and humanitarian volunteer dispatch platform for India.',
  keywords: [
    'Disaster Management India',
    'NDMA',
    'GIS Disaster Intelligence',
    'Volentify',
    'Cyclone Remal',
    'Assam Floods',
    'Volunteer Response',
    'NDRF',
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className="bg-background text-slate-300 min-h-screen flex flex-col antialiased selection:bg-primary selection:text-slate-950 font-sans"
        suppressHydrationWarning
      >
        <Navbar />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
