import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Munaxa — The Future of School Operations | Coming Soon",
  description:
    "Munaxa unifies attendance, CliQ financial ledgers, and parent communication into one lightweight School OS. Join the waitlist for early access.",
  keywords: [
    "School OS",
    "School Management",
    "Attendance System",
    "CliQ Integration",
    "Parent Communication",
    "Education Technology",
    "School Software",
  ],
  authors: [{ name: "Munaxa" }],
  openGraph: {
    title: "Munaxa — The Future of School Operations",
    description:
      "A comprehensive School OS platform unifying attendance, finance, and communication.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth">
      <head>
        {/* Preconnect to Google Fonts for performance */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Sora:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
