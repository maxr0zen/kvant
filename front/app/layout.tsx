import type { Metadata } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/theme-provider";

const ibmPlexSans = IBM_Plex_Sans({
  subsets: ["latin", "cyrillic"],
  variable: "--font-sans",
  weight: ["400", "500", "600", "700"],
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin", "cyrillic"],
  variable: "--font-mono",
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Образовательная платформа",
  description: "Платформа для обучения программированию",
};

const themeScript = `
(function() {
  var t = localStorage.getItem('theme');
  var d = window.matchMedia('(prefers-color-scheme: dark)').matches;
  if (t === 'dark' || (!t && d)) document.documentElement.classList.add('dark');
  else document.documentElement.classList.remove('dark');
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className={`${ibmPlexSans.variable} ${ibmPlexMono.variable} min-h-screen antialiased`}>
        <ThemeProvider>
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
