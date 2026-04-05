import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "./components/ThemeProvider";
import Navigation from "./components/Navigation";

export const metadata: Metadata = {
  title: "CricScore - Cricket Scoring",
  description: "Real-time cricket scoring for cricket matches",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script src="https://js.pusher.com/8.2.0/pusher.min.js"></script>
      </head>
      <body className="antialiased">
        <ThemeProvider>
          <Navigation />
          <div className="relative min-h-[calc(100vh-4rem)]">
            {children}
          </div>
          <footer className="footer-enhanced text-center py-6 text-xs border-t border-[var(--border)] mt-12 bg-[var(--card)]/45 backdrop-blur-xl relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[var(--primary)]/5 to-transparent animate-[shimmer_3s_ease-in-out_infinite]" />
            <p className="footer-credit inline-flex flex-wrap items-baseline justify-center gap-x-1.5 text-sm md:text-base relative z-10">
              <span className="footer-credit-prefix">Made by</span>
              <span className="footer-credit-typewrap">
                <span className="footer-credit-name">Tejas Pawar</span>
              </span>
            </p>
          </footer>
        </ThemeProvider>
      </body>
    </html>
  );
}
