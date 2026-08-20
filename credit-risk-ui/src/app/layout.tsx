import type { Metadata } from "next";
import { ThemeToggle } from "@/components/ThemeToggle";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI & ML Credit Approval Predictor",
  description: "Enterprise credit risk assessment dashboard.",
};

const themeScript = `
(function(){try{var c=document.cookie.match(/(?:^|;)\\s*l2lTheme=([^;]*)/);if(c){document.documentElement.setAttribute('data-theme',c[1])}}catch(e){}})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="antialiased">
        <div className="min-h-screen bg-bg">
          <header className="sticky top-0 z-50 border-b border-border bg-surface/80 backdrop-blur-sm">
            <div className="page-container flex items-center justify-between h-12">
              <h1 className="text-sm font-semibold text-text">Credit Risk Predictor</h1>
              <ThemeToggle />
            </div>
          </header>
          <main>{children}</main>
        </div>
      </body>
    </html>
  );
}
