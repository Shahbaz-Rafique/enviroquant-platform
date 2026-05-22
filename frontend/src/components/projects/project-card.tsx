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
      <Card className="group h-full overflow-hidden transition-colors hover:border-blue-400 hover:bg-blue-50/30">
        <div className="flex h-full min-h-64 flex-col">
          <div className="border-b border-slate-200 bg-white p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <Badge className={cn(statusBadgeClass(status))}>{formatStatus(project.status)}</Badge>
              <span className="grid size-8 shrink-0 place-items-center rounded-sm bg-blue-50 text-blue-700 transition-colors group-hover:bg-blue-100">
                <ArrowRight className="size-4" />
              </span>
            </div>
            <h3 className="line-clamp-2 text-lg font-bold leading-snug text-slate-950">{project.name}</h3>
            <p className="mt-2 line-clamp-3 min-h-16 text-sm leading-6 text-slate-600">
              {project.description || "Project description pending. Add project scope, location, and assessment notes."}
            </p>
          </div>

          <div className="grid flex-1 content-between gap-4 p-4">
            <dl className="grid gap-3 text-sm">
              <ProjectMeta icon={<MapPin />} label="Location" value={project.location || project.country || "Pending"} />
              <ProjectMeta icon={<FileText />} label="Sector" value={project.sector || "Pending"} />
              <ProjectMeta icon={<CalendarDays />} label="Updated" value={formatDate(project.updated_at)} />
            </dl>

            <div className="flex items-center justify-between gap-3 border-t border-slate-200 pt-3">
              <span className="flex items-center gap-2 text-xs font-bold uppercase text-slate-500">
                <Clock3 className="size-4 text-blue-700" />
                Workspace
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
      <span className="text-blue-700 [&_svg]:size-4">{icon}</span>
      <dt className="font-bold text-slate-500">{label}</dt>
      <dd className="truncate text-right font-semibold text-slate-800">{value}</dd>
    </div>
  );
}

function statusBadgeClass(status: string) {
  if (status === "DRAFT") {
    return "border-blue-200 bg-blue-50 text-blue-700";
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
