"use client";

import { BarChart3 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import type { EiaDocumentProgress } from "@/lib/types";

type EiaProgressOverviewProps = {
  progress: EiaDocumentProgress | null;
};

export function EiaProgressOverview({ progress }: EiaProgressOverviewProps) {
  const percentage = Math.round(progress?.progress_percentage ?? 0);

  return (
    <section className="builder-panel overflow-hidden">
      <div className="builder-section-title flex items-center justify-between gap-3">
        <span className="flex items-center gap-2">
          <BarChart3 className="size-5 text-blue-700" />
          Progress
        </span>
        <Badge>{percentage}%</Badge>
      </div>
      <div className="grid gap-4 p-4">
        <div>
          <div className="mb-2 flex items-center justify-between gap-3 text-sm">
            <span className="font-semibold text-slate-700">Overall document</span>
            <span className="font-bold text-slate-950">
              {progress?.completed_subsections ?? 0}/{progress?.total_subsections ?? 0}
            </span>
          </div>
          <Progress value={percentage} />
        </div>

        <div className="grid gap-3">
          {progress?.sections.map((section) => (
            <div key={section.section_id}>
              <div className="mb-1 flex items-center justify-between gap-3 text-xs">
                <span className="line-clamp-1 font-bold text-slate-700">
                  {section.section_number}. {section.title}
                </span>
                <span className="shrink-0 font-bold text-slate-500">{Math.round(section.progress_percentage)}%</span>
              </div>
              <Progress value={section.progress_percentage} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
