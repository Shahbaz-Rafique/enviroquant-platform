
import "./globals.css";

// app/layout.tsx
import type { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
  title: {
    default: 'EnviroQuant | AI-Powered EIA Software',
    template: '%s | EnviroQuant',
  },
  description:
    'EnviroQuant is an AI-powered Environmental Intelligence Platform that helps consultants create and regulators review Environmental Impact Assessments (EIAs) faster, more accurately, and in full compliance with global standards.',
  keywords: [
    'EIA Software',
    'Environmental Impact Assessment',
    'AI EIA Tool',
    'Environmental Compliance Software',
    'EIA Builder',
    'EIA Review Platform',
    'Environmental Intelligence',
    'SaaS EIA Solution',
    'Regulatory Compliance',
    'Sustainable Development Software',
  ],
  authors: [{ name: 'EnviroQuant', url: 'https://enviroquant.com' }],
  creator: 'EnviroQuant',
  publisher: 'EnviroQuant',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://enviroquant.com',
    siteName: 'EnviroQuant',
    title: 'EnviroQuant - AI-Powered EIA Platform for Global Environmental Compliance',
    description:
      'Standardize and accelerate EIA creation, review, and approval using intelligent AI workflows. Designed for environmental consultants and regulatory authorities worldwide.',
    images: [
      {
        url: '/og-image.jpg', // Recommended: 1200x630
        width: 1200,
        height: 630,
        alt: 'EnviroQuant Platform Dashboard',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'EnviroQuant | AI EIA Software',
    description:
      'Intelligent platform for creating and reviewing Environmental Impact Assessments.',
    images: ['/og-image.jpg'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};
export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-gradient text-white antialiased">{children}</body>
    </html>
  );
}
