"use client";

import { ArrowLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type BreadcrumbItem = {
  label: string;
  href?: string;
};

type PageNavigationProps = {
  breadcrumbs: BreadcrumbItem[];
  backHref?: string;
  backLabel?: string;
  actions?: ReactNode;
  className?: string;
};

export function PageNavigation({
  breadcrumbs,
  backHref,
  backLabel = "Back",
  actions,
  className
}: PageNavigationProps) {
  return (
    <div className={cn("mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between", className)}>
      <nav aria-label="Breadcrumb" className="min-w-0">
        <ol className="flex min-w-0 flex-wrap items-center gap-1 text-sm font-semibold text-white/52">
          {breadcrumbs.map((item, index) => {
            const last = index === breadcrumbs.length - 1;
            return (
              <li className="flex min-w-0 items-center gap-1" key={`${item.label}-${index}`}>
                {item.href && !last ? (
                  <Link className="rounded-lg px-2 py-1 text-[#B6F7FF] hover:bg-white/[0.06] hover:text-white" href={item.href}>
                    {item.label}
                  </Link>
                ) : (
                  <span className={cn("truncate px-1", last && "text-white")}>{item.label}</span>
                )}
                {!last ? <ChevronRight className="size-4 shrink-0 text-white/34" /> : null}
              </li>
            );
          })}
        </ol>
      </nav>

      <div className="flex flex-wrap gap-2">
        {backHref ? (
          <Button asChild variant="secondary">
            <Link href={backHref}>
              <ArrowLeft />
              {backLabel}
            </Link>
          </Button>
        ) : null}
        {actions}
      </div>
    </div>
  );
}
