"use client";

import { ArrowRight, BriefcaseBusiness, ClipboardCheck, FileClock, FolderPlus, Leaf, RefreshCcw, Search, ShieldCheck } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ProjectCard } from "@/components/projects/project-card";
import { apiRequest } from "@/lib/api-client";
import {
  canAccessAuthorPortal,
  canAccessRegulatorPortal,
  canAccessReviewPortal,
  hasPermission,
  PERMISSIONS,
  portalName,
} from "@/lib/permissions";
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

  const pageTitle = compact ? "Projects" : portalName(user);
  const reviewerOnly = canAccessReviewPortal(user) && !canAccessAuthorPortal(user);
  const regulatorOnly = canAccessRegulatorPortal(user) && !canAccessAuthorPortal(user) && !reviewerOnly;
  const pageDescription = compact
    ? "Find, open and manage your organisation’s active environmental assessment work."
    : reviewerOnly
      ? "Open your assigned projects, review submitted subsections, request revisions, and record approval decisions."
      : regulatorOnly
        ? "Inspect the environmental assessment projects made available to you through the regulator workspace."
        : "Create structured Environmental Impact Assessments, connect every claim to its evidence and coordinate delivery in one secure workspace.";

  return (
    <>
      {!compact ? (
        <section className="portal-hero relative mb-5 overflow-hidden rounded-[3px] border border-[#19352c] bg-[#071c17]">
          <Image
            aria-hidden="true"
            alt=""
            className="pointer-events-none absolute -bottom-28 right-[-3rem] hidden h-[400px] w-[400px] object-contain opacity-45 mix-blend-screen lg:block"
            height={640}
            src="/images/leaf.png"
            width={640}
          />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_30%,rgba(87,133,61,0.22),transparent_28%),linear-gradient(90deg,rgba(7,28,23,1)_0%,rgba(7,28,23,0.97)_58%,rgba(7,28,23,0.58)_100%)]" />
          <div className="relative grid gap-5 p-6 md:p-8 xl:grid-cols-[minmax(0,1fr)_300px] xl:items-center">
            <div>
              <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-[#91bd61]">
                <Leaf className="size-4" /> AI-powered environmental intelligence
              </div>
              <h1 className="mt-3 max-w-3xl text-3xl font-bold tracking-[-0.025em] text-white md:text-4xl">
                {pageTitle}
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-white/66 md:text-base">{pageDescription}</p>
              <p className="mt-4 flex items-center gap-2 text-sm font-semibold text-[#a9cc77]">
                <ShieldCheck className="size-4" /> Evidence Before Conclusions™
              </p>
            </div>
            <div className="border border-white/10 bg-[#102a21]/90 p-4 backdrop-blur-sm">
              <span className="inline-flex rounded-sm border border-[#587d42] bg-[#183b2d] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-[#a9cc77]">Platform roadmap</span>
              <p className="mt-3 text-sm font-semibold leading-6 text-white/88">
                Developed toward an Environmental Intelligence Operating System™
              </p>
              <p className="mt-1 text-xs leading-5 text-white/48">Future platform capabilities are clearly marked and are not represented as currently available.</p>
            </div>
          </div>
        </section>
      ) : null}

      <section className="builder-panel mb-5 overflow-hidden">
        <div className="grid gap-5 border-b border-[#e3eae6] p-5 lg:grid-cols-[minmax(0,1fr)_auto]">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#287451]">
              {compact ? "Current EIA capability" : "Your work"}
            </p>
            <h2 className="mt-1 text-2xl font-bold tracking-[-0.02em] text-[#173c2e]">{compact ? pageTitle : "Project portfolio"}</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[#697a73]">
              {compact
                ? pageDescription
                : reviewerOnly
                  ? "Only projects containing your assigned review work are shown."
                  : regulatorOnly
                    ? "Only projects shared with your regulatory role are shown."
                    : "Open an assessment to continue authoring, upload evidence, or manage assignments."}
            </p>
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

        <div className="grid divide-y divide-[#e3eae6] md:grid-cols-4 md:divide-x md:divide-y-0">
          <PortfolioStat icon={<BriefcaseBusiness />} label="Total Projects" value={stats.total} />
          <PortfolioStat icon={<FileClock />} label="Active" value={stats.active} denominator={stats.total} />
          <PortfolioStat icon={<ClipboardCheck />} label="Draft" value={stats.draft} denominator={stats.total} />
          <PortfolioStat icon={<Search />} label="In Review" value={stats.review} denominator={stats.total} />
        </div>
      </section>

      <section className="builder-panel">
        <div className="border-b border-[#e3eae6] px-5 py-4">
          <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-center">
            <div>
              <h2 className="text-lg font-bold text-[#18372c]">Active workspace</h2>
              <p className="mt-1 text-sm text-[#697a73]">
                Showing {filteredProjects.length} of {projects.length} project records.
              </p>
            </div>
            <div className="grid gap-3 md:grid-cols-[minmax(260px,1fr)_180px] xl:min-w-[540px]">
              <label className="relative block">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#8a9993]" />
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
      <span className="grid size-10 shrink-0 place-items-center rounded-lg border border-[#cce0d5] bg-[#edf6f1] text-[#287451] [&_svg]:size-5">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-end justify-between gap-3">
          <strong className="block text-2xl font-bold leading-none text-[#18372c]">{value}</strong>
          {percentage !== null ? <span className="text-xs font-bold text-[#72827b]">{percentage}%</span> : null}
        </div>
        <span className="mt-1 block truncate text-xs font-bold uppercase text-[#72827b]">{label}</span>
        {percentage !== null ? <Progress className="mt-3 h-1.5" value={percentage} /> : null}
      </div>
    </div>
  );
}

function EmptyProjects({ canCreate }: { canCreate: boolean }) {
  return (
    <div className="grid min-h-60 place-items-center rounded-xl border border-dashed border-[#cbdad3] bg-[#f8faf9] p-6 text-center">
      <div className="max-w-md">
        <div className="mx-auto grid size-12 place-items-center rounded-lg border border-[#cce0d5] bg-[#edf6f1] text-[#287451]">
          <BriefcaseBusiness className="size-6" />
        </div>
        <h3 className="mt-4 text-lg font-bold text-[#18372c]">Create your first EIA project</h3>
        <p className="mt-2 text-sm leading-6 text-[#697a73]">
          Create a project workspace before uploading evidence or building a structured EIA document.
        </p>
        {canCreate ? (
          <Button asChild className="mt-4">
            <Link href="/projects/new">
              <FolderPlus />
              Start a project <ArrowRight />
            </Link>
          </Button>
        ) : null}
      </div>
    </div>
  );
}
