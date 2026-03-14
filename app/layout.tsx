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
          {children}
          <footer className="text-center py-4 text-xs opacity-40 border-t border-[var(--border)] mt-8">
            Made by Tejas Pawar
          </footer>
        </ThemeProvider>
      </body>
    </html>
  );
}
