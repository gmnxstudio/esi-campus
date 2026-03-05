import BottomNav from "@/components/BottomNav";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";
import InstallPrompt from "@/components/InstallPrompt";

export default function AppLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen bg-cream max-w-lg mx-auto relative">
            <main className="pb-safe min-h-screen">{children}</main>
            <BottomNav />
            <ServiceWorkerRegister />
            <InstallPrompt />
        </div>
    );
}
