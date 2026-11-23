import type { Metadata } from 'next';
import './globals.css';
import Header from '@/components/layout/header';
import Footer from '@/components/layout/footer';

export const metadata: Metadata = {
  title: 'StreamFetch — High-Speed Media & Playlist Extractor',
  description: 'Download videos, audio, and complete playlists directly into your browser or IDM with high-speed multi-threading and zero disk storage.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="flex min-h-screen flex-col bg-[#09090b] text-neutral-100 antialiased selection:bg-neutral-700 selection:text-white">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
