import type { Metadata } from 'next';
import '@fontsource/space-grotesk/400.css';
import '@fontsource/space-grotesk/500.css';
import '@fontsource/space-grotesk/600.css';
import '@fontsource/space-grotesk/700.css';
import '@fontsource/jetbrains-mono/400.css';
import '@fontsource/doto/600.css';
import './globals.css';
import { PageIntro } from '@/components/page-intro';
import { INTRO_WATCHDOG } from '@/lib/intro';
export const metadata: Metadata = {
  title: 'CodeLens — Watch code think.',
  description:
    'A quiet space to see how code works. Trace Python and JavaScript, explore data structures, and understand every step with an offline code breakdown.',
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <PageIntro>{children}</PageIntro>
        <script dangerouslySetInnerHTML={{ __html: INTRO_WATCHDOG }} />
        <noscript>
          <style>{'.page-intro { display: none; }'}</style>
          <p>CodeLens needs JavaScript for its editor and local tracing.</p>
        </noscript>
      </body>
    </html>
  );
}
