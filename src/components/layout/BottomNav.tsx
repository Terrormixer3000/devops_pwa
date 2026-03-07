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
  { href: "/explorer", label: "Code", icon: FolderGit2 },
  { href: "/pull-requests", label: "PRs", icon: GitPullRequest },
  { href: "/pipelines", label: "Delivery", icon: Rocket },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="pointer-events-none fixed inset-x-0 bottom-0 z-40 px-3"
      style={{ paddingBottom: "calc(var(--bottom-nav-safe-area) + var(--bottom-nav-offset))" }}
    >
      <div className="pointer-events-auto mx-auto max-w-[34rem] overflow-hidden rounded-[1.65rem] border border-white/12 bg-[rgba(28,28,30,0.78)] shadow-[0_14px_34px_rgba(0,0,0,0.38),0_1px_0_rgba(255,255,255,0.08)_inset] backdrop-blur-[28px]">
        <div className="grid min-h-[var(--bottom-nav-content-height)] grid-cols-5 items-stretch px-1.5 py-1.5">
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
                aria-current={isActive ? "page" : undefined}
                className={`group flex min-h-[50px] flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-1 transition-colors active:opacity-75 ${
                  isActive ? "text-[#0A84FF]" : "text-[#8E8E93] hover:text-[#AEAEB2]"
                }`}
              >
                <Icon size={20} className={isActive ? "stroke-[2.45px]" : "group-hover:text-[#AEAEB2]"} />
                <span className={`text-[10px] leading-none tracking-[0.01em] ${isActive ? "font-medium text-[#0A84FF]" : "font-normal text-[#8E8E93] group-hover:text-[#AEAEB2]"}`}>
                  {label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
