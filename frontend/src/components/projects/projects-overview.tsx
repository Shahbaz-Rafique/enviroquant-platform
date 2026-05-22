"use client";

import { BriefcaseBusiness, ClipboardCheck, FileClock, FolderPlus, RefreshCcw, Search } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ProjectCard } from "@/components/projects/project-card";
import { apiRequest } from "@/lib/api-client";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import type { Project, User } from "@/lib/types";

type ProjectsOverviewProps = {
  user: User;
  compact?: boolean;
};

export function ProjectsOverview({ compact = false, user }: ProjectsOverviewProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const loadProjects = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setProjects(await apiRequest<Project[]>("/projects"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Projects could not be loaded");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  const stats = useMemo(
    () => ({
      total: projects.length,
      draft: projects.filter((project) => project.status.toUpperCase() === "DRAFT").length,
      review: projects.filter((project) => project.status.toUpperCase() === "IN_REVIEW").length,
      active: projects.filter((project) => !["ARCHIVED", "DELETED"].includes(project.status.toUpperCase())).length
    }),
    [projects]
  );

  const statusOptions = useMemo(() => {
    const statuses = Array.from(new Set(projects.map((project) => project.status.toUpperCase()))).sort();
    return ["all", ...statuses];
  }, [projects]);

  const filteredProjects = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    return projects.filter((project) => {
      const matchesStatus = statusFilter === "all" || project.status.toUpperCase() === statusFilter;
      const searchableText = [
        project.name,
        project.description,
        project.location,
        project.country,
        project.sector,
        project.status
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return matchesStatus && (!normalizedQuery || searchableText.includes(normalizedQuery));
    });
  }, [projects, searchQuery, statusFilter]);

  const pageTitle = compact ? "Project Portfolio" : "EnviroQuant Dashboard";
  const pageDescription = compact
    ? "Find, open, and manage tenant-scoped EIA projects, evidence, and structured assessment workspaces."
    : "Projects, evidence documents, and tenant-scoped review work are kept inside your organization boundary.";

  return (
    <>
      <section className="mb-5 overflow-hidden rounded-md border border-slate-300 bg-white shadow-workspace">
        <div className="grid gap-5 border-b border-slate-200 p-5 lg:grid-cols-[minmax(0,1fr)_auto]">
          <div className="min-w-0">
            <p className="text-sm font-black uppercase text-blue-700">
              {compact ? "Project Management" : "Core Workspace"}
            </p>
            <h1 className="mt-1 text-3xl font-bold tracking-normal text-slate-950">{pageTitle}</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{pageDescription}</p>
          </div>
          <div className="flex flex-wrap items-start gap-2">
            <Button variant="secondary" onClick={loadProjects}>
              <RefreshCcw />
              Refresh
            </Button>
            {hasPermission(user, PERMISSIONS.PROJECT_CREATE) ? (
              <Button asChild>
                <Link href="/projects/new">
                  <FolderPlus />
                  New Project
                </Link>
              </Button>
            ) : null}
          </div>
        </div>

        <div className="grid divide-y divide-slate-200 md:grid-cols-4 md:divide-x md:divide-y-0">
          <PortfolioStat icon={<BriefcaseBusiness />} label="Total Projects" value={stats.total} />
          <PortfolioStat icon={<FileClock />} label="Active" value={stats.active} denominator={stats.total} />
          <PortfolioStat icon={<ClipboardCheck />} label="Draft" value={stats.draft} denominator={stats.total} />
          <PortfolioStat icon={<Search />} label="In Review" value={stats.review} denominator={stats.total} />
        </div>
      </section>

      <section className="builder-panel">
        <div className="border-b border-slate-200 px-5 py-4">
          <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-center">
            <div>
              <h2 className="text-lg font-bold text-slate-950">Projects</h2>
              <p className="mt-1 text-sm text-slate-500">
                Showing {filteredProjects.length} of {projects.length} project records.
              </p>
            </div>
            <div className="grid gap-3 md:grid-cols-[minmax(260px,1fr)_180px] xl:min-w-[540px]">
              <label className="relative block">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <Input
                  className="pl-9"
                  placeholder="Search by name, sector, location, or status"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                />
              </label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status === "all" ? "All statuses" : status.replaceAll("_", " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <div className="p-5">
          {error ? <Alert className="mb-4 border-red-200 bg-red-50 text-red-700">{error}</Alert> : null}
          {loading ? <Alert>Loading projects...</Alert> : null}
          {!loading && !projects.length ? (
            <EmptyProjects canCreate={hasPermission(user, PERMISSIONS.PROJECT_CREATE)} />
          ) : null}
          {!loading && projects.length && !filteredProjects.length ? (
            <Alert>No projects match the current filters.</Alert>
          ) : null}
          <div className={cn("grid gap-4 md:grid-cols-2 xl:grid-cols-3", compact && "2xl:grid-cols-4")}>
            {filteredProjects.map((project) => (
              <ProjectCard project={project} key={project.id} />
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

function PortfolioStat({
  icon,
  label,
  value,
  denominator
}: {
  icon: ReactNode;
  label: string;
  value: number;
  denominator?: number;
}) {
  const percentage = denominator ? Math.round((value / Math.max(denominator, 1)) * 100) : null;

  return (
    <div className="flex min-w-0 items-center gap-3 px-5 py-4">
      <span className="grid size-10 shrink-0 place-items-center rounded-md bg-blue-50 text-blue-700 [&_svg]:size-5">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-end justify-between gap-3">
          <strong className="block text-2xl font-black leading-none text-slate-950">{value}</strong>
          {percentage !== null ? <span className="text-xs font-bold text-slate-500">{percentage}%</span> : null}
        </div>
        <span className="mt-1 block truncate text-xs font-bold uppercase text-slate-500">{label}</span>
        {percentage !== null ? <Progress className="mt-3 h-1.5" value={percentage} /> : null}
      </div>
    </div>
  );
}

function EmptyProjects({ canCreate }: { canCreate: boolean }) {
  return (
    <div className="grid min-h-60 place-items-center rounded-md border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
      <div className="max-w-md">
        <div className="mx-auto grid size-12 place-items-center rounded-md bg-blue-50 text-blue-700">
          <BriefcaseBusiness className="size-6" />
        </div>
        <h3 className="mt-4 text-lg font-bold text-slate-950">No projects yet</h3>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Create a project workspace before uploading evidence or building a structured EIA document.
        </p>
        {canCreate ? (
          <Button asChild className="mt-4">
            <Link href="/projects/new">
              <FolderPlus />
              New Project
            </Link>
          </Button>
        ) : null}
      </div>
    </div>
  );
}
