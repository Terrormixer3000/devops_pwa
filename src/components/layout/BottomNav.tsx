"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  GitPullRequest,
  FolderGit2,
  Rocket,
  Settings,
} from "lucide-react";

// Navigationseintraege fuer die untere Leiste
const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/pull-requests", label: "PRs", icon: GitPullRequest },
  { href: "/explorer", label: "Code", icon: FolderGit2 },
  { href: "/pipelines", label: "Delivery", icon: Rocket },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 overflow-hidden border-t border-slate-700/80 bg-slate-900/84 shadow-[0_-10px_28px_rgba(0,0,0,0.24)] backdrop-blur-xl bottom-nav-safe-area">
      {/* Die Leiste sitzt jetzt wieder ueber die volle Breite am unteren Rand, die iOS-Anmutung kommt ueber Blur und aktive Pills. */}
      <div className="flex min-h-[var(--bottom-nav-content-height)] items-center justify-around px-2 py-1.5">
        {navItems.map(({ href, label, icon: Icon }) => {
          // Aktiven Zustand ermitteln
          const isDeliveryItem = href === "/pipelines";
          const isActive = isDeliveryItem
            ? pathname === "/pipelines" || pathname.startsWith("/pipelines/") || pathname === "/releases" || pathname.startsWith("/releases/")
            : pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={`flex min-h-[46px] min-w-[52px] flex-col items-center justify-center gap-0.5 rounded-2xl px-2 py-1 transition-all active:scale-[0.98] ${
                isActive
                  ? "bg-blue-500/12 text-blue-300"
                  : "text-slate-500 hover:bg-slate-800/60 hover:text-slate-300"
              }`}
            >
              <Icon size={20} className={isActive ? "stroke-[2.5px]" : ""} />
              <span className={`text-[10px] font-medium tracking-[0.01em] ${isActive ? "text-blue-200" : ""}`}>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
