import { CartProvider } from "@/context/cart-context";
import { CartSidebar } from "@/components/cart/CartSidebar";
import { MobileNav } from "@/components/layout/MobileNav";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { createClient } from "@/utils/supabase/server";
import { getUserProfile, getMyPermissions } from "@/app/(app)/profile/actions";
import { Toaster } from "sonner";

export default async function AppLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const profile = user ? await getUserProfile() : null;
    const permissions = user ? await getMyPermissions() : [];

    return (
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
            <Toaster
                position="top-right"
                richColors
                toastOptions={{
                    style: {
                        background: 'var(--surface)',
                        border: '1px solid var(--border)',
                        color: 'var(--foreground)',
                    },
                    className: 'font-sans',
                }}
            />
        </CartProvider>
    );
}
