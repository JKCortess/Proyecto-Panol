import { getAllProfiles, getRolePermissions, isCurrentUserAdmin } from "@/app/profile/actions";
import { ArrowLeft, Users, Shield, Lock } from "lucide-react";
import { IndustrialCard } from "@/components/ui/IndustrialCard";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminUserTable } from "./AdminUserTable";
import { AdminPermissionsPanel } from "./AdminPermissionsPanel";
import { WebhookConfigPanel } from "./WebhookConfigPanel";
import { getWebhookConfig } from "./webhook-actions";

export default async function AdminPage() {
    const isAdmin = await isCurrentUserAdmin();

    if (!isAdmin) {
        redirect('/');
    }

    const [profiles, operadorPermissions, webhookConfig] = await Promise.all([
        getAllProfiles(),
        getRolePermissions('Operador'),
        getWebhookConfig(),
    ]);

    const adminCount = profiles.filter(p => p.role === 'Administrador').length;
    const operadorCount = profiles.filter(p => p.role === 'Operador').length;

    return (
        <main className="min-h-screen p-6 md:p-12 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-200">
            <div className="max-w-7xl mx-auto space-y-8">

                <header className="flex items-center justify-between pb-6 border-b border-slate-200 dark:border-slate-800">
                    <div>
                        <Link href="/" className="flex items-center text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors mb-2 gap-2 text-sm font-mono uppercase tracking-wider">
                            <ArrowLeft className="w-4 h-4" /> Volver al Dashboard
                        </Link>
                        <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Administración</h1>
                        <p className="text-slate-500 dark:text-slate-400">Gestión de roles, usuarios y permisos de acceso.</p>
                    </div>
                    <div className="p-3 rounded-full bg-purple-500/10 border border-purple-500/20">
                        <Shield className="w-6 h-6 text-purple-400" />
                    </div>
                </header>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <IndustrialCard className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-slate-500 dark:text-slate-400 font-medium text-sm uppercase tracking-wider">Total Usuarios</h3>
                            <Users className="w-5 h-5 text-blue-500" />
                        </div>
                        <div className="text-3xl font-bold text-slate-900 dark:text-white mb-1 font-mono">{profiles.length}</div>
                        <p className="text-xs text-slate-500">Usuarios registrados en el sistema</p>
                    </IndustrialCard>

                    <IndustrialCard className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-slate-500 dark:text-slate-400 font-medium text-sm uppercase tracking-wider">Administradores</h3>
                            <Shield className="w-5 h-5 text-purple-500" />
                        </div>
                        <div className="text-3xl font-bold text-slate-900 dark:text-white mb-1 font-mono">{adminCount}</div>
                        <p className="text-xs text-slate-500">Acceso completo al sistema</p>
                    </IndustrialCard>

                    <IndustrialCard className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-slate-500 dark:text-slate-400 font-medium text-sm uppercase tracking-wider">Operadores</h3>
                            <Lock className="w-5 h-5 text-amber-500" />
                        </div>
                        <div className="text-3xl font-bold text-slate-900 dark:text-white mb-1 font-mono">{operadorCount}</div>
                        <p className="text-xs text-slate-500">Acceso restringido por permisos</p>
                    </IndustrialCard>
                </div>

                {/* Webhook Configuration */}
                <WebhookConfigPanel config={webhookConfig} />

                {/* Permissions Panel */}
                <AdminPermissionsPanel permissions={operadorPermissions} />

                {/* User Table */}
                <AdminUserTable profiles={profiles} />
            </div>
        </main>
    );
}
