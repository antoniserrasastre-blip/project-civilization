import type {Metadata} from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Project Civilization',
  description: 'A primordial god-game of clan survival and evolution.',
  icons: {
    icon: '/favicon.svg',
  },
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en" className="font-sans">
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
