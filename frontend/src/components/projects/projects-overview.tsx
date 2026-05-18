"use client";

import { FolderPlus, RefreshCcw } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ProjectCard } from "@/components/projects/project-card";
import { apiRequest } from "@/lib/api-client";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";
import type { Project, User } from "@/lib/types";

type ProjectsOverviewProps = {
  user: User;
  compact?: boolean;
};

export function ProjectsOverview({ compact = false, user }: ProjectsOverviewProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      review: projects.filter((project) => project.status.toUpperCase() === "IN_REVIEW").length
    }),
    [projects]
  );

  return (
    <>
      <header className="mb-5 flex flex-col justify-between gap-4 md:flex-row md:items-start">
        <div>
          <p className="text-sm font-bold uppercase text-blue-700">Core Workspace</p>
          <h1 className="mt-1 text-3xl font-bold text-slate-950">EnviroQuant Dashboard</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Projects, evidence documents, and tenant-scoped review work are kept inside your organization boundary.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
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
      </header>

      {!compact ? (
        <section className="mb-5 grid gap-4 md:grid-cols-3">
          <Card>
            <CardContent>
              <p className="text-sm font-bold uppercase text-slate-500">Total Projects</p>
              <strong className="mt-3 block text-4xl text-slate-950">{stats.total}</strong>
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <p className="text-sm font-bold uppercase text-slate-500">Draft</p>
              <strong className="mt-3 block text-4xl text-slate-950">{stats.draft}</strong>
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <p className="text-sm font-bold uppercase text-slate-500">In Review</p>
              <strong className="mt-3 block text-4xl text-slate-950">{stats.review}</strong>
            </CardContent>
          </Card>
        </section>
      ) : null}

      <section className="builder-panel">
        <div className="builder-section-title flex items-center justify-between gap-3">
          <span>My Projects</span>
          <span className="text-sm font-medium text-slate-500">{projects.length} records</span>
        </div>
        <div className="p-5">
          {error ? <Alert className="mb-4 border-red-200 bg-red-50 text-red-700">{error}</Alert> : null}
          {loading ? <Alert>Loading projects...</Alert> : null}
          {!loading && !projects.length ? <Alert>No projects created.</Alert> : null}
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {projects.map((project) => (
              <ProjectCard project={project} key={project.id} />
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
