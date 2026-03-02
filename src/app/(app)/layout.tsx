import { RealtimeProvider } from "@/components/providers/realtime-provider";
import { BottomNav } from "@/components/layout/bottom-nav";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <RealtimeProvider>
      <div className="flex flex-col h-dvh">
        <main className="flex-1 overflow-y-auto mx-auto w-full max-w-lg px-5 pt-5 pb-5">
          {children}
        </main>
        <BottomNav />
      </div>
    </RealtimeProvider>
  );
}
