import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'VeriFrame — AI Video Detection',
  description:
    'Detect AI-generated and deepfake videos with forensic-grade analysis. Upload any video and get a detailed authenticity report in seconds.',
  keywords: 'deepfake detection, AI video detector, video authenticity, fake video checker',
  openGraph: {
    title: 'VeriFrame — AI Video Detection',
    description: 'Forensic-grade AI video authenticity analysis',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&family=Instrument+Sans:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-void text-slate-100 font-body antialiased">
        {children}
      </body>
    </html>
  );
}