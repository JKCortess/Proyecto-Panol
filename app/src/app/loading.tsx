export default function Loading() {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 gap-4">
            <div className="relative flex h-16 w-16">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-20"></span>
                <span className="relative inline-flex rounded-full h-16 w-16 bg-transparent border-4 border-blue-500 border-t-transparent animate-spin"></span>
            </div>
            <p className="text-slate-400 font-mono text-sm animate-pulse">CARGANDO DATOS...</p>
        </div>
    );
}
