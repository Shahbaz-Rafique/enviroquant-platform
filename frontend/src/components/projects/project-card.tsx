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
      <Card className="group h-full overflow-hidden transition-colors hover:border-[#67E8F9]/28 hover:bg-white/[0.06]">
        <div className="flex h-full min-h-64 flex-col">
          <div className="border-b border-white/10 bg-white/[0.03] p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <Badge className={cn(statusBadgeClass(status))}>{formatStatus(project.status)}</Badge>
              <span className="grid size-8 shrink-0 place-items-center rounded-xl border border-[#67E8F9]/20 bg-[#67E8F9]/10 text-[#B6F7FF] transition-colors group-hover:bg-[#67E8F9]/16">
                <ArrowRight className="size-4" />
              </span>
            </div>
            <h3 className="line-clamp-2 text-lg font-bold leading-snug text-white">{project.name}</h3>
            <p className="mt-2 line-clamp-3 min-h-16 text-sm leading-6 text-white/66">
              {project.description || "Project description pending. Add project scope, location, and assessment notes."}
            </p>
          </div>

          <div className="grid flex-1 content-between gap-4 p-4">
            <dl className="grid gap-3 text-sm">
              <ProjectMeta icon={<MapPin />} label="Location" value={project.location || project.country || "Pending"} />
              <ProjectMeta icon={<FileText />} label="Sector" value={project.sector || "Pending"} />
              <ProjectMeta icon={<CalendarDays />} label="Updated" value={formatDate(project.updated_at)} />
            </dl>

            <div className="flex items-center justify-between gap-3 border-t border-white/10 pt-3">
              <span className="flex items-center gap-2 text-xs font-bold uppercase text-white/52">
                <Clock3 className="size-4 text-[#B6F7FF]" />
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
      <span className="text-[#B6F7FF] [&_svg]:size-4">{icon}</span>
      <dt className="font-bold text-white/52">{label}</dt>
      <dd className="truncate text-right font-semibold text-white/84">{value}</dd>
    </div>
  );
}

function statusBadgeClass(status: string) {
  if (status === "DRAFT") {
    return "border-[#67E8F9]/20 bg-[#67E8F9]/10 text-[#B6F7FF]";
  }
  if (status === "IN_REVIEW" || status === "REVIEW") {
    return "border-amber-400/20 bg-amber-500/10 text-amber-200";
  }
  if (status === "APPROVED" || status === "COMPLETE") {
    return "border-emerald-400/20 bg-emerald-500/10 text-emerald-200";
  }
  return "border-white/12 bg-white/[0.05] text-white/68";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(new Date(value));
}
