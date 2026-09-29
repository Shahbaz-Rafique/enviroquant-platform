"use client";

import { CheckCircle2, Circle, CircleDot } from "lucide-react";

import { cn } from "@/lib/utils";

const WORKFLOW_STEPS = [
  { value: "NOT_STARTED", label: "Not Started", short: "New" },
  { value: "ASSIGNED", label: "Assigned", short: "Assigned" },
  { value: "IN_PROGRESS", label: "In Progress", short: "Writing" },
  { value: "READY_FOR_REVIEW", label: "Ready for Review", short: "Review" },
  { value: "UNDER_REVIEW", label: "Under Review", short: "Reviewing" },
  { value: "REVISION_REQUIRED", label: "Revision Required", short: "Revise" },
  { value: "APPROVED", label: "Approved", short: "Approved" },
] as const;

type WorkflowStepperProps = {
  status: string;
  compact?: boolean;
};

export function EiaWorkflowStepper({ status, compact = false }: WorkflowStepperProps) {
  const normalized = status === "COMPLETE" ? "APPROVED" : status;
  const currentIndex = WORKFLOW_STEPS.findIndex((step) => step.value === normalized);
  const isRevision = normalized === "REVISION_REQUIRED";

  return (
    <div className="flex items-center gap-0.5" role="progressbar" aria-valuenow={currentIndex + 1} aria-valuemin={1} aria-valuemax={WORKFLOW_STEPS.length}>
      {WORKFLOW_STEPS.map((step, index) => {
        const isPast = index < currentIndex && !isRevision;
        const isCurrent = index === currentIndex;

        return (
          <div key={step.value} className="flex items-center gap-0.5">
            {index > 0 ? (
              <span
                className={cn(
                  "h-[2px] rounded-full transition-colors",
                  compact ? "w-2" : "w-2 sm:w-4 md:w-6",
                  isPast ? "bg-emerald-400" : isCurrent ? "bg-[#287451]" : "bg-[#dce6e1]"
                )}
              />
            ) : null}
            <div className="group relative flex flex-col items-center">
              {isPast ? (
                <CheckCircle2 className={cn("shrink-0 text-emerald-500", compact ? "size-3.5" : "size-3.5 sm:size-4")} />
              ) : isCurrent ? (
                <CircleDot className={cn(
                  "shrink-0",
                  compact ? "size-3.5" : "size-3.5 sm:size-4",
                  isRevision ? "text-amber-600" : normalized === "APPROVED" ? "text-emerald-600" : "text-[#287451]"
                )} />
              ) : (
                <Circle className={cn("shrink-0 text-[#c4d4cc]", compact ? "size-3.5" : "size-3.5 sm:size-4")} />
              )}
              {!compact ? (
                <span className={cn(
                  "absolute top-5 hidden whitespace-nowrap text-[9px] font-semibold leading-none sm:block",
                  isPast ? "text-emerald-600" : isCurrent ? (isRevision ? "text-amber-700" : "text-[#287451]") : "text-[#9aaba3]"
                )}>
                  {step.short}
                </span>
              ) : null}
              <span className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-[#18372c] px-2 py-1 text-[10px] font-medium text-white opacity-0 shadow-lg transition-opacity group-hover:pointer-events-auto group-hover:opacity-100">
                {step.label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
