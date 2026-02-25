import './globals.css';
import type { Metadata } from 'next';
import { ClerkProvider } from '@clerk/nextjs';
import { Toaster } from '@/components/ui/toaster';

export const metadata: Metadata = {
  title: 'MediVoice AI – Clinical Voice Assistant',
  description: 'HIPAA-compliant AI-powered medical voice assistant for symptom analysis, specialist matching, and clinical health reports.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning>
        <head>
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
          <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&family=DM+Serif+Display:ital@0;1&display=swap" rel="stylesheet" />
        </head>
        <body className="min-h-screen bg-background antialiased" style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>
          {children}
          <Toaster />
        </body>
      </html>
    </ClerkProvider>
  );
}
