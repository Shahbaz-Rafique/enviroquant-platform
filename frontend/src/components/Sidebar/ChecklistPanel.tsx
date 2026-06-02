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
  Compliant: "border-emerald-400/25 bg-emerald-500/10 text-emerald-100",
  "Partially Compliant": "border-amber-400/25 bg-amber-500/10 text-amber-100",
  Missing: "border-red-400/30 bg-red-500/10 text-red-100"
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
                "rounded-2xl border border-white/10 bg-white/[0.03] p-3",
                active && "border-[#67E8F9]/28 bg-[#67E8F9]/10"
              )}
              key={item.id}
            >
              <div className="flex items-start gap-3">
                <span className="mt-1 grid size-8 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/[0.06] text-[#B6F7FF]">
                  <Icon className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold uppercase text-white/46">{item.subsection_number}</span>
                    <Badge className={cn("border", statusStyles[item.compliance_status] ?? statusStyles.Missing)}>
                      {item.compliance_status}
                    </Badge>
                  </div>
                  <p className="mt-2 text-sm font-semibold leading-5 text-white">{item.checklist_title}</p>
                  <div className="mt-2 text-xs font-bold uppercase text-white/46">
                    {item.checklist_section} · {item.importance}
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <span className="text-xs font-semibold text-white/52">{Math.round(item.progress_percentage)}%</span>
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
