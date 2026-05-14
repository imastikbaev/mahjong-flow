import type { Metadata } from 'next';
import { Geist } from 'next/font/google';
import ThemeProvider from '@/components/ThemeProvider';
import './globals.css';

const geist = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
});

export const metadata: Metadata = {
  title: 'Mahjong Flow | Cognitive Focus & Digital Detox',
  description: 'A premium, AI-powered 3D Mahjong Solitaire designed for cognitive focus, deep flow states, and digital detox.',
  openGraph: {
    title: 'Mahjong Flow | Cognitive Focus & Digital Detox',
    description: 'A premium, AI-powered 3D Mahjong Solitaire designed for cognitive focus.',
    images: ['/og-image.jpg'],
  },
  twitter: {
    card: 'summary_large_image',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geist.variable} h-full`} suppressHydrationWarning>
      <body className="min-h-full flex flex-col antialiased">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
