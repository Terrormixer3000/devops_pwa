"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  LayoutDashboard,
  GitPullRequest,
  FolderGit2,
  Rocket,
  Settings,
} from "lucide-react";

export function BottomNav() {
  const pathname = usePathname();
  const t = useTranslations("nav");

  const navItems = [
    { href: "/dashboard", label: t("dashboard"), icon: LayoutDashboard },
    { href: "/explorer", label: t("code"), icon: FolderGit2 },
    { href: "/pull-requests", label: t("prs"), icon: GitPullRequest },
    { href: "/pipelines", label: t("delivery"), icon: Rocket },
    { href: "/settings", label: t("settings"), icon: Settings },
  ];

  return (
    <nav
      className="pointer-events-none fixed inset-x-0 bottom-0 z-40 px-3"
      style={{ paddingBottom: "calc(var(--bottom-nav-safe-area) + var(--bottom-nav-offset))" }}
    >
      <div className="pointer-events-auto mx-auto max-w-[34rem] overflow-hidden rounded-[1.65rem] border border-slate-700/40 bg-[var(--bottom-nav-bg,rgba(28,28,30,0.78))] shadow-[0_14px_34px_rgba(0,0,0,0.38),0_1px_0_rgba(255,255,255,0.08)_inset] backdrop-blur-[28px] [html[data-theme='light']_&]:border-slate-300/50">
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
                  isActive ? "text-blue-500" : "text-slate-500 hover:text-slate-400"
                }`}
              >
                <Icon size={20} className={isActive ? "stroke-[2.45px]" : "group-hover:text-slate-400"} />
                <span className={`text-[10px] leading-none tracking-[0.01em] ${isActive ? "font-medium text-blue-500" : "font-normal text-slate-500 group-hover:text-slate-400"}`}>
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
