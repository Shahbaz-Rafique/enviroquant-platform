import { ArrowRight, CalendarDays, MapPin } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { Project } from "@/lib/types";

type ProjectCardProps = {
  project: Project;
};

function formatStatus(status: string) {
  return status.replaceAll("_", " ").toUpperCase();
}

export function ProjectCard({ project }: ProjectCardProps) {
  return (
    <Link href={`/projects/${project.id}`} className="block">
      <Card className="h-full transition-colors hover:border-blue-400">
        <CardContent className="flex h-full min-h-44 flex-col justify-between">
          <div>
            <div className="mb-4 flex items-center justify-between gap-3">
              <Badge>{formatStatus(project.status)}</Badge>
              <ArrowRight className="size-4 text-blue-700" />
            </div>
            <h3 className="text-lg font-bold text-slate-950">{project.name}</h3>
            <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600">
              {project.description || "Project description pending."}
            </p>
          </div>
          <div className="mt-5 grid gap-2 text-sm text-slate-600">
            <span className="flex min-w-0 items-center gap-2">
              <MapPin className="size-4 shrink-0 text-blue-700" />
              <span className="truncate">{project.location || project.country || "Location pending"}</span>
            </span>
            <span className="flex min-w-0 items-center gap-2">
              <CalendarDays className="size-4 shrink-0 text-blue-700" />
              <span className="truncate">{project.sector || "Sector pending"}</span>
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
