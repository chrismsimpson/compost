import '../styles/globals.css';

import { cn } from './lib/cn';

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html suppressHydrationWarning>
      <body
        className={cn(
          'relative flex min-h-screen flex-col bg-background font-sans antialiased')}
      >{children}</body>
    </html>
  );
}