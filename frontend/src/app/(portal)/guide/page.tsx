"use client";

import {
  BookOpen,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  FileText,
  FolderOpen,
  Layers,
  PenLine,
  Send,
  ShieldCheck,
  Upload,
  Users,
} from "lucide-react";
import Link from "next/link";

import { useAuth } from "@/components/auth/auth-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { displayRole } from "@/lib/permissions";

const WORKFLOW_STEPS = [
  { status: "Not Started", description: "Subsection created but no author assigned yet.", color: "bg-slate-200 text-slate-700" },
  { status: "Assigned", description: "An author has been assigned. Click 'Start work' to begin.", color: "bg-blue-100 text-blue-700" },
  { status: "In Progress", description: "Author is actively writing. Save drafts as you work.", color: "bg-[#edf6f1] text-[#287451]" },
  { status: "Ready for Review", description: "Author submitted for review. Awaiting reviewer action.", color: "bg-amber-100 text-amber-700" },
  { status: "Under Review", description: "Reviewer is examining the content and may leave comments.", color: "bg-amber-100 text-amber-700" },
  { status: "Revision Required", description: "Reviewer requested changes. Author should revise and resubmit.", color: "bg-rose-100 text-rose-700" },
  { status: "Approved", description: "Reviewer approved. Subsection is locked from further edits.", color: "bg-emerald-100 text-emerald-700" },
];

const QUICK_START_STEPS = [
  { icon: FolderOpen, title: "Create a project", description: "Set up your environmental impact assessment project with location, sector, and timeline details." },
  { icon: Upload, title: "Upload evidence", description: "Upload source documents (baseline studies, reports, surveys) that will support EIA sections." },
  { icon: Layers, title: "Create an EIA document", description: "Generate the structured EIA using the South African checklist framework with 8 major sections." },
  { icon: Users, title: "Assign team members", description: "Assign authors and reviewers to sections and subsections based on their expertise." },
  { icon: PenLine, title: "Author subsections", description: "Write evidence-based content for each checklist item, referencing source documents." },
  { icon: Send, title: "Submit for review", description: "When content is complete, submit each subsection for reviewer evaluation." },
  { icon: ShieldCheck, title: "Review and approve", description: "Reviewers examine content, leave comments, and approve or request revisions." },
  { icon: CheckCircle2, title: "Export final EIA", description: "Export the completed assessment as PDF, DOCX, or JSON for submission." },
];

const ROLE_DESCRIPTIONS = [
  { role: "Admin", capabilities: ["Full platform access", "Manage team members and invitations", "Create and manage all projects", "All author and reviewer capabilities"] },
  { role: "Project Manager", capabilities: ["Create and manage projects", "Upload documents", "Assign sections to team members", "Monitor progress dashboard", "Export reports"] },
  { role: "Consultant", capabilities: ["Author assigned subsections", "Upload supporting documents", "View project documents", "Submit work for review"] },
  { role: "Reviewer", capabilities: ["Review submitted subsections", "Leave comments and feedback", "Approve or request revisions", "Access review portal and queue"] },
];

export default function UserGuidePage() {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <header>
        <div className="flex items-center gap-2 text-xs text-[#6b7d75]">
          <Link href="/dashboard" className="hover:text-[#287451]">Dashboard</Link>
          <ChevronRight className="size-3" />
          <span className="font-semibold text-[#287451]">Platform Guide</span>
        </div>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-[#18372c]">Platform Guide</h1>
        <p className="mt-2 text-base text-[#697a73]">
          Welcome, {user.full_name}. This guide covers everything you need to use EnviroQuant effectively as {displayRole(user) === "Admin" ? "an" : "a"} <strong>{displayRole(user)}</strong>.
        </p>
      </header>

      <section>
        <h2 className="mb-4 text-xl font-bold text-[#18372c]">Quick Start: Your First EIA</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {QUICK_START_STEPS.map((step, index) => {
            const Icon = step.icon;
            return (
              <div key={step.title} className="flex items-start gap-3 rounded-xl border border-[#dce6e1] bg-white p-4">
                <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-[#edf6f1] text-xs font-bold text-[#287451]">{index + 1}</span>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Icon className="size-4 text-[#287451]" />
                    <h3 className="text-sm font-bold text-[#18372c]">{step.title}</h3>
                  </div>
                  <p className="mt-1 text-xs leading-5 text-[#697a73]">{step.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-xl font-bold text-[#18372c]">Review Workflow</h2>
        <p className="mb-4 text-sm text-[#697a73]">Every subsection follows a controlled 7-state workflow. Only authorized transitions are allowed — the system enforces the correct sequence.</p>
        <div className="space-y-2">
          {WORKFLOW_STEPS.map((step, index) => (
            <div key={step.status} className="flex items-start gap-3 rounded-xl border border-[#dce6e1] bg-white p-4">
              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-[#f0f4f2] text-xs font-bold text-[#52675e]">{index + 1}</span>
              <div>
                <Badge className={step.color}>{step.status}</Badge>
                <p className="mt-1 text-xs leading-5 text-[#697a73]">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-xl font-bold text-[#18372c]">User Roles</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {ROLE_DESCRIPTIONS.map((item) => (
            <Card key={item.role}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{item.role}</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1">
                  {item.capabilities.map((cap) => (
                    <li key={cap} className="flex items-start gap-2 text-xs text-[#697a73]">
                      <CheckCircle2 className="mt-0.5 size-3 shrink-0 text-emerald-500" />
                      {cap}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-xl font-bold text-[#18372c]">Key Features</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <FeatureCard icon={<Layers className="size-5" />} title="Structured EIA Builder" description="8-section framework with 43+ subsections following the South African EIA checklist. Each section covers a specific assessment domain." />
          <FeatureCard icon={<Users className="size-5" />} title="Multi-Team Collaboration" description="Assign sections to domain specialists. Track who is responsible, their progress, due dates, and open comments." />
          <FeatureCard icon={<ShieldCheck className="size-5" />} title="AI Compliance Review" description="Run AI-powered evaluations that check content against regulatory requirements. Review findings with severity ratings and evidence citations." />
          <FeatureCard icon={<FileText className="size-5" />} title="Source Document Intelligence" description="Upload evidence documents. The platform extracts content chunks and enables direct source-to-subsection mapping for traceability." />
          <FeatureCard icon={<ClipboardCheck className="size-5" />} title="Controlled Review Workflow" description="7-state workflow ensures proper review gates. Subsections must be reviewed and approved before the EIA can be finalized." />
          <FeatureCard icon={<BookOpen className="size-5" />} title="Export & Reporting" description="Export the completed EIA as PDF, DOCX, or JSON. Generate evaluation reports with compliance findings and recommendations." />
        </div>
      </section>

      <section className="rounded-xl border border-[#dce6e1] bg-[#f8faf9] p-6 text-center">
        <h2 className="text-lg font-bold text-[#18372c]">Ready to begin?</h2>
        <p className="mt-1 text-sm text-[#697a73]">Start by viewing your assigned work or creating a new project.</p>
        <div className="mt-4 flex justify-center gap-3">
          <Button asChild>
            <Link href="/projects">View projects</Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href="/projects/new">Create project</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="rounded-xl border border-[#dce6e1] bg-white p-4">
      <div className="flex items-center gap-2 text-[#287451]">
        {icon}
        <h3 className="text-sm font-bold text-[#18372c]">{title}</h3>
      </div>
      <p className="mt-2 text-xs leading-5 text-[#697a73]">{description}</p>
    </div>
  );
}
