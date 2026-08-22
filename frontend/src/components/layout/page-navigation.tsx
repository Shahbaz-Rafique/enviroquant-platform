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
      <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
        {backHref ? (
          <Button asChild className="shrink-0 self-start" variant="secondary">
            <Link href={backHref}>
              <ArrowLeft />
              {backLabel}
            </Link>
          </Button>
        ) : null}
        {backHref ? <span aria-hidden="true" className="hidden h-6 w-px bg-[#dfe3de] sm:block" /> : null}
        <nav aria-label="Breadcrumb" className="min-w-0 overflow-hidden">
          <ol className="flex min-w-0 items-center gap-1 overflow-x-auto whitespace-nowrap text-sm font-semibold text-[#73827c]">
            {breadcrumbs.map((item, index) => {
              const last = index === breadcrumbs.length - 1;
              return (
                <li className="flex min-w-0 items-center gap-1" key={`${item.label}-${index}`}>
                  {item.href && !last ? (
                    <Link className="rounded-md px-2 py-1 text-[#287451] hover:bg-[#eaf3ee]" href={item.href}>
                      {item.label}
                    </Link>
                  ) : (
                    <span aria-current={last ? "page" : undefined} className={cn("truncate px-1", last && "text-[#29483c]")}>{item.label}</span>
                  )}
                  {!last ? <ChevronRight className="size-4 shrink-0 text-[#a0ada7]" /> : null}
                </li>
              );
            })}
          </ol>
        </nav>
      </div>

      {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}
