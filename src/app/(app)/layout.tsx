import { RealtimeProvider } from "@/components/providers/realtime-provider";
import { BottomNav } from "@/components/layout/bottom-nav";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <RealtimeProvider>
      <main className="flex-1 mx-auto w-full max-w-lg px-5 pt-5 pb-28">
        {children}
      </main>
      <BottomNav />
    </RealtimeProvider>
  );
}
