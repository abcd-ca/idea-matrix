"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CircleHelpIcon } from "lucide-react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConnectAiPanel } from "@/components/connect-ai";
import { GitHubMark } from "@/components/github-mark";
import { LogoMark } from "@/components/logo-mark";
import { startTour } from "@/components/tour";
import { WhatsNewBell } from "@/components/whats-new";
import { APP_NAME, SOURCE_URL } from "@/lib/config";
import { useAppStore } from "@/lib/store";
import { StatusLine } from "@/components/status-line";
import { useTranslation } from "react-i18next";

const NAV = [
  { href: "/", label: "nav.matrix" },
  { href: "/parked/", label: "nav.parked" },
  { href: "/settings/", label: "nav.settings" },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const { t } = useTranslation("common");
  const pathname = usePathname();
  const parkedCount = useAppStore((s) => s.doc?.ideas.filter((i) => i.stage === "Parked").length ?? 0);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" || pathname.startsWith("/idea") : pathname.startsWith(href);

  return (
    <div className="flex min-h-screen-safe flex-col md:flex-row">
      <aside className="flex shrink-0 flex-col gap-1 border-b bg-muted/30 p-3 md:w-52 md:border-r md:border-b-0 md:p-4">
        <div className="flex items-center justify-between gap-2 md:mb-4">
          <Link href="/" className="inline-flex items-center gap-2 font-heading text-xl font-bold">
            <LogoMark className="size-5" />
            {APP_NAME}
          </Link>
          <div className="flex items-center gap-1">
            <WhatsNewBell />
            <div className="md:hidden">
              <HelpMenu />
            </div>
          </div>
        </div>
        <nav className="flex gap-1 md:flex-col" aria-label={t("nav.main")}>
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm",
                isActive(item.href) ? "bg-primary text-primary-foreground" : "hover:bg-muted",
              )}
            >
              {item.href === "/parked/" && parkedCount > 0
                ? t("nav.parkedWithCount", { count: parkedCount })
                : t(item.label)}
            </Link>
          ))}
        </nav>
        <div className="hidden md:block">
          <HelpMenu />
        </div>
        <div className="hidden flex-1 md:block" />
        <div className="hidden flex-col gap-3 md:flex">
          <ConnectAiPanel compact />
          <StatusLine />
        </div>
      </aside>
      <main className="flex-1 p-4 md:p-8">{children}</main>
      <div className="border-t p-2 text-center md:hidden">
        <StatusLine compact />
      </div>
    </div>
  );
}

function HelpMenu() {
  const { t } = useTranslation("common");
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-sm hover:bg-muted"
        aria-label={t("help.label")}
      >
        <CircleHelpIcon className="size-4" /> {t("help.label")}
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem onClick={() => startTour()}>{t("help.tour")}</DropdownMenuItem>
        <DropdownMenuItem render={<Link href="/privacy/" />}>{t("help.privacy")}</DropdownMenuItem>
        {SOURCE_URL ? (
          <DropdownMenuItem render={<a href={SOURCE_URL} target="_blank" rel="noreferrer" />}>
            <GitHubMark className="size-4" /> {t("help.source")}
          </DropdownMenuItem>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export { Button };
