"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  GitPullRequest,
  FolderGit2,
  PlayCircle,
  Rocket,
  Settings,
} from "lucide-react";

// Navigationseintraege fuer die untere Leiste
const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/pull-requests", label: "PRs", icon: GitPullRequest },
  { href: "/explorer", label: "Code", icon: FolderGit2 },
  { href: "/pipelines", label: "Pipelines", icon: PlayCircle },
  { href: "/releases", label: "Releases", icon: Rocket },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 safe-area-bottom">
      <div className="flex items-center justify-around px-1 py-2">
        {navItems.map(({ href, label, icon: Icon }) => {
          // Aktiven Zustand ermitteln
          const isActive = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center gap-0.5 min-w-[52px] py-1.5 px-2 rounded-xl transition-colors ${
                isActive
                  ? "text-blue-400"
                  : "text-slate-500 hover:text-slate-300"
              }`}
            >
              <Icon size={22} className={isActive ? "stroke-[2.5px]" : ""} />
              <span className="text-[10px] font-medium">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
