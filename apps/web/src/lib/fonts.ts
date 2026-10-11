import { IBM_Plex_Sans_Arabic, Inter, JetBrains_Mono, Sora } from 'next/font/google';

/*
 * The three faces the platform's typography names (`--font-display`, `--font-body`,
 * `--font-mono`), plus the Arabic family it puts in front of the system fallback for RTL text.
 * Loading a webfont is the application's job; the theme contract only references the variables.
 */
const display = Sora({ subsets: ['latin'], variable: '--font-display' });
const body = Inter({ subsets: ['latin'], variable: '--font-body' });
const mono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono' });
const arabic = IBM_Plex_Sans_Arabic({
  subsets: ['arabic'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-arabic',
});

/** Applied to `<html>` by every root layout. */
export const fontVariables = [display, body, mono, arabic].map((f) => f.variable).join(' ');
