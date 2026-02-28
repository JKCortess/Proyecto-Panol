
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Gestión de Pañol | Dole Molina",
  description: "Sistema de Gestión de Inventario Industrial",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="theme-dark h-full" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (() => {
                try {
                  const stored = localStorage.getItem('ui-theme');
                  const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                  const theme = stored === 'light' || stored === 'dark' ? stored : (systemDark ? 'dark' : 'light');
                  const root = document.documentElement;
                  root.classList.remove('theme-light', 'theme-dark', 'dark');
                  root.classList.add(theme === 'dark' ? 'theme-dark' : 'theme-light');
                  if (theme === 'dark') root.classList.add('dark');
                } catch {}
              })();
            `,
          }}
        />
      </head>
      <body className="antialiased h-full overflow-hidden flex flex-col">
        {children}
      </body>
    </html>
  );
}
