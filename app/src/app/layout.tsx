
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Gestión de Pañol | Dole Molina",
  description: "Sistema de Gestión de Inventario Industrial",
};

import { CartProvider } from "@/context/cart-context";
import { CartSidebar } from "@/components/cart/CartSidebar";
import { MobileNav } from "@/components/layout/MobileNav";

import { AppSidebar } from "@/components/layout/AppSidebar";
import { createClient } from "@/utils/supabase/server";
import { getUserProfile, getMyPermissions } from "@/app/profile/actions";
import { Toaster } from "sonner";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const profile = user ? await getUserProfile() : null;
  const permissions = user ? await getMyPermissions() : [];

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
        <CartProvider>
          <div className="flex h-full w-full overflow-hidden">
            {/* Fixed Sidebar */}
            <AppSidebar user={user} profile={profile} permissions={permissions} />

            {/* Scrollable Main Content */}
            <main className="flex-1 h-full overflow-y-auto w-full relative pb-20 md:pb-0">
              {children}
            </main>

            {/* Mobile Navigation */}
            <MobileNav user={user} profile={profile} permissions={permissions} />

            {/* Overlays */}
            <CartSidebar />
          </div>
          <Toaster />
        </CartProvider>
      </body>
    </html>
  );
}

