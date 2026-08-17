import { ArrowRight, CalendarDays, Clock3, FileText, MapPin } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { Project } from "@/lib/types";

type ProjectCardProps = {
  project: Project;
};

function formatStatus(status: string) {
  return status.replaceAll("_", " ").toUpperCase();
}

export function ProjectCard({ project }: ProjectCardProps) {
  const status = project.status.toUpperCase();

  return (
    <Link href={`/projects/${project.id}`} className="block">
      <Card className="group h-full overflow-hidden transition-all hover:-translate-y-0.5 hover:border-[#a8cbbb] hover:shadow-[0_12px_28px_rgba(15,45,34,0.1)]">
        <div className="flex h-full min-h-64 flex-col">
          <div className="border-b border-[#e3eae6] bg-[#f8faf9] p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <Badge className={cn(statusBadgeClass(status))}>{formatStatus(project.status)}</Badge>
              <span className="grid size-8 shrink-0 place-items-center rounded-lg border border-[#cce0d5] bg-[#edf6f1] text-[#287451] transition-colors group-hover:bg-[#dfeee6]">
                <ArrowRight className="size-4" />
              </span>
            </div>
            <h3 className="line-clamp-2 text-lg font-bold leading-snug text-[#18372c]">{project.name}</h3>
            <p className="mt-2 line-clamp-3 min-h-16 text-sm leading-6 text-[#697a73]">
              {project.description || "Project description pending. Add project scope, location, and assessment notes."}
            </p>
          </div>

          <div className="grid flex-1 content-between gap-4 p-4">
            <dl className="grid gap-3 text-sm">
              <ProjectMeta icon={<MapPin />} label="Location" value={project.location || project.country || "Pending"} />
              <ProjectMeta icon={<FileText />} label="Sector" value={project.sector || "Pending"} />
              <ProjectMeta icon={<CalendarDays />} label="Updated" value={formatDate(project.updated_at)} />
            </dl>

            <div className="flex items-center justify-between gap-3 border-t border-[#e3eae6] pt-3">
              <span className="flex items-center gap-2 text-xs font-bold uppercase text-[#72827b]">
                <Clock3 className="size-4 text-[#287451]" />
                EIA workspace
              </span>
              <Button className="pointer-events-none" size="sm" variant="secondary">
                Open
                <ArrowRight />
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );
}

function ProjectMeta({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="grid grid-cols-[1rem_minmax(0,7rem)_minmax(0,1fr)] items-center gap-2">
      <span className="text-[#287451] [&_svg]:size-4">{icon}</span>
      <dt className="font-bold text-[#72827b]">{label}</dt>
      <dd className="truncate text-right font-semibold text-[#344f44]">{value}</dd>
    </div>
  );
}

function statusBadgeClass(status: string) {
  if (status === "DRAFT") {
    return "border-slate-200 bg-slate-100 text-slate-600";
  }
  if (status === "IN_REVIEW" || status === "REVIEW") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }
  if (status === "APPROVED" || status === "COMPLETE") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  return "border-slate-200 bg-slate-50 text-slate-600";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(new Date(value));
}
