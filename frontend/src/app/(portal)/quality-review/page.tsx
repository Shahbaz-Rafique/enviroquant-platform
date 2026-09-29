"use client";

import { FileSearch, ShieldCheck, UploadCloud } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";

import QualityReviewWorkspace from "@/app/(portal)/projects/[projectId]/quality-review/page";
import { useAuth } from "@/components/auth/auth-provider";
import { AccessDenied } from "@/components/layout/access-denied";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest } from "@/lib/api-client";
import { canAccessAuthorPortal, canAccessReadOnlyPortal, canAccessReviewPortal } from "@/lib/permissions";
import type { Project } from "@/lib/types";

export default function QualityReviewPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    apiRequest<Project[]>("/projects")
      .then((items) => {
        setProjects(items);
        setProjectId((current) => {
          const next = current || items[0]?.id || "";
          if (next) router.replace(`/quality-review?projectId=${encodeURIComponent(next)}`, { scroll: false });
          return next;
        });
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Projects could not be loaded"));
  }, [router, user]);

  if (!user) return null;
  if (!canAccessReviewPortal(user) && !canAccessAuthorPortal(user) && !canAccessReadOnlyPortal(user)) return <AccessDenied />;

  return (
    <div className="grid gap-6">
      <section className="workspace-dark-surface overflow-hidden rounded-[28px] border border-[#174c3a] bg-[#062a22] text-white shadow-[0_24px_70px_rgba(6,42,34,0.22)]">
        <div className="grid gap-6 p-6 sm:p-8 xl:grid-cols-[minmax(0,1fr)_380px] xl:items-center">
          <div>
            <Badge className="border-[#8bd15f]/35 bg-[#8bd15f]/12 text-[#d8ffbb]">Independent assessment module</Badge>
            <h1 className="mt-4 max-w-4xl text-3xl font-bold leading-tight tracking-[-0.025em] sm:text-4xl">
              EIA Quality Review &amp; Decision Readiness
            </h1>
            <p className="mt-4 max-w-3xl text-base leading-7 text-white/78">
              Upload an existing EIA, analyse every detailed RQEIA requirement, resolve evidence-linked weaknesses, re-run the assessment and produce a professional review report.
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <HeroPoint icon={<UploadCloud />} label="Upload existing EIA" />
              <HeroPoint icon={<FileSearch />} label="Detailed RQEIA findings" />
              <HeroPoint icon={<ShieldCheck />} label="Reviewer decision" />
            </div>
          </div>

          <div className="rounded-2xl border border-white/15 bg-white/10 p-5 backdrop-blur-sm">
            <label className="grid gap-2 text-sm font-bold text-white">
              Select the project for this review
              <Select value={projectId} onValueChange={(value) => {
                setProjectId(value);
                router.replace(`/quality-review?projectId=${encodeURIComponent(value)}`, { scroll: false });
              }}>
                <SelectTrigger className="min-h-12 border-white/25 bg-white text-[#18372c]">
                  <SelectValue placeholder="Choose a project" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((project) => <SelectItem key={project.id} value={project.id}>{project.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </label>
            <p className="mt-3 text-sm leading-6 text-white/68">
              The project supplies access control and evidence storage. Quality Review remains a separate module from EIA Builder.
            </p>
          </div>
        </div>
        <div className="grid border-t border-white/12 bg-black/10 text-sm sm:grid-cols-2 xl:grid-cols-4">
          {["1. Upload report", "2. Run AI review", "3. Improve & re-analyse", "4. Export DOCX / PDF"].map((step) => (
            <div className="border-white/10 px-6 py-4 font-semibold text-white/80 xl:border-r" key={step}>{step}</div>
          ))}
        </div>
      </section>

      {error ? <Alert className="border-red-300 bg-red-50 text-red-800">{error}</Alert> : null}
      {!error && !projects.length ? <Alert>Create a project before starting an EIA Quality Review.</Alert> : null}
      {projectId ? <QualityReviewWorkspace key={projectId} /> : null}
    </div>
  );
}

function HeroPoint({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <div className="flex min-h-12 items-center gap-3 rounded-xl border border-white/12 bg-white/[0.07] px-4 py-3 text-sm font-semibold text-white/90">
      <span className="text-[#a7e56f] [&_svg]:size-5" aria-hidden="true">{icon}</span>
      {label}
    </div>
  );
}
