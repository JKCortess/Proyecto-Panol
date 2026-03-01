export default function LandingLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <div className="h-full w-full overflow-x-hidden overflow-y-auto">
            {children}
        </div>
    );
}
