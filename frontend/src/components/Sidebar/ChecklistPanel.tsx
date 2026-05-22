"use client";

import { CircleAlert, CircleCheck, CircleDashed, Send } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { EiaChecklistItem } from "@/lib/types";

type ChecklistPanelProps = {
  activeSubsectionId: string;
  items: EiaChecklistItem[];
  onAddressItem: (item: EiaChecklistItem) => void;
};

const statusStyles: Record<string, string> = {
  Compliant: "border-emerald-200 bg-emerald-50 text-emerald-700",
  "Partially Compliant": "border-amber-200 bg-amber-50 text-amber-700",
  Missing: "border-red-200 bg-red-50 text-red-700"
};

export function ChecklistPanel({ activeSubsectionId, items, onAddressItem }: ChecklistPanelProps) {
  return (
    <section className="builder-panel overflow-hidden">
      <div className="builder-section-title flex items-center justify-between gap-3">
        <span>Checklist</span>
        <Badge>{items.length}</Badge>
      </div>
      <div className="grid max-h-[34rem] gap-3 overflow-y-auto p-4">
        {items.map((item) => {
          const Icon = iconForStatus(item.compliance_status);
          const active = item.id === activeSubsectionId;
          return (
            <article
              className={cn(
                "rounded-md border border-slate-200 bg-white p-3",
                active && "border-blue-300 bg-blue-50/60"
              )}
              key={item.id}
            >
              <div className="flex items-start gap-3">
                <span className="mt-1 grid size-8 shrink-0 place-items-center rounded-md bg-slate-100 text-slate-700">
                  <Icon className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold uppercase text-slate-500">{item.subsection_number}</span>
                    <Badge className={cn("border", statusStyles[item.compliance_status] ?? statusStyles.Missing)}>
                      {item.compliance_status}
                    </Badge>
                  </div>
                  <p className="mt-2 text-sm font-semibold leading-5 text-slate-900">{item.checklist_title}</p>
                  <div className="mt-2 text-xs font-bold uppercase text-slate-500">
                    {item.checklist_section} - {item.importance}
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <span className="text-xs font-semibold text-slate-500">{Math.round(item.progress_percentage)}%</span>
                    <Button size="sm" type="button" variant="secondary" onClick={() => onAddressItem(item)}>
                      <Send />
                      Address this point
                    </Button>
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function iconForStatus(status: string) {
  if (status === "Compliant") {
    return CircleCheck;
  }
  if (status === "Partially Compliant") {
    return CircleDashed;
  }
  return CircleAlert;
}
