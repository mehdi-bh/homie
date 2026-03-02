"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, CalendarDays, ShoppingCart, UtensilsCrossed, Calendar } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/dashboard", label: "Accueil", icon: Home },
  { href: "/week", label: "Semaine", icon: Calendar },
  { href: "/grocery", label: "Courses", icon: ShoppingCart },
  { href: "/meals", label: "Repas", icon: UtensilsCrossed },
  { href: "/agenda", label: "Agenda", icon: CalendarDays },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="mx-auto max-w-lg px-3 pb-1">
        <div className="flex items-center justify-around rounded-2xl bg-card/90 backdrop-blur-xl shadow-[0_-2px_24px_-4px_rgba(0,0,0,0.08)] border border-border/50 px-1 py-1">
          {tabs.map(({ href, label, icon: Icon }) => {
            const active =
              pathname === href ||
              pathname.startsWith(href + "/") ||
              (href === "/meals" &&
                (pathname.startsWith("/dinner") ||
                  pathname.startsWith("/lunch") ||
                  pathname.startsWith("/recipes")));
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "relative flex flex-col items-center gap-0.5 px-3 py-2 text-[11px] font-medium transition-colors min-w-[52px] min-h-[48px] justify-center rounded-xl",
                  active ? "text-primary" : "text-muted-foreground"
                )}
              >
                {active && (
                  <motion.div
                    layoutId="nav-pill"
                    className="absolute inset-0 bg-primary/8 rounded-xl"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                <motion.div
                  animate={{ scale: active ? 1 : 0.92, y: active ? -1 : 0 }}
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                >
                  <Icon className="h-[22px] w-[22px]" strokeWidth={active ? 2.2 : 1.8} />
                </motion.div>
                <span className="relative">{label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
