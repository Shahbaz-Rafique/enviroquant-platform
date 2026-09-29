"use client";

import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  BookOpen,
  BrainCircuit,
  CalendarCheck,
  Check,
  ChevronDown,
  ChevronRight,
  CircleCheck,
  ClipboardCheck,
  CloudSun,
  Database,
  Factory,
  FileCheck2,
  FileText,
  FolderOpen,
  GitBranch,
  Globe2,
  Leaf,
  Linkedin,
  Loader2,
  LogIn,
  LogOut,
  Mail,
  Menu,
  Network,
  Quote,
  RefreshCcw,
  Scale,
  Send,
  ShieldCheck,
  Sparkles,
  Twitter,
  Upload,
  UserCircle,
  Users,
  X,
  Zap,
  type LucideIcon
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useCurrentUser } from "@/components/auth/auth-gate";
import { clearSession } from "@/lib/auth";
import { displayRole } from "@/lib/permissions";
import type { User } from "@/lib/types";

type Feature = {
  title: string;
  description: string;
  icon: LucideIcon;
};

type Step = {
  title: string;
  description: string;
  icon: LucideIcon;
};

const navigation = [
  { label: "Solutions", href: "#solutions" },
  { label: "Knowledge Library", href: "#knowledge-library" },
  { label: "About", href: "#about" },
  { label: "Contact", href: "#contact" }
];

const logos = ["KOC", "KEPA", "EPA", "ISO 14001", "HSEMS"];

const features: Feature[] = [
  {
    title: "AI-Powered EIA Builder",
    description: "Draft scoped chapters, impact matrices, mitigation measures, and executive summaries with structured AI assistance.",
    icon: BrainCircuit
  },
  {
    title: "Automated Compliance Review",
    description: "Find missing evidence, weak claims, regulatory gaps, and unresolved comments before formal submission.",
    icon: FileCheck2
  },
  {
    title: "Checklist-Driven Quality Assurance",
    description: "Convert internal QA standards and regulator expectations into repeatable review checkpoints.",
    icon: ClipboardCheck
  },
  {
    title: "Evidence Traceability & Versioning",
    description: "Connect every assessment statement to source files, revisions, reviewer comments, and supporting records.",
    icon: GitBranch
  },
  {
    title: "Knowledge Library & Reuse",
    description: "Reuse approved language, methods, precedents, commitments, and regulatory references with governance.",
    icon: BookOpen
  },
  {
    title: "Regulatory Framework",
    description: "Align EIA work against KEPA, KOC HSEMS, lender requirements, and organization-specific protocols.",
    icon: Scale
  },
  {
    title: "Team Collaboration",
    description: "Coordinate consultants, HSE teams, subject experts, reviewers, and project owners in one workspace.",
    icon: Users
  },
  {
    title: "Professional Report Generation",
    description: "Export polished reports, annexures, action trackers, and review responses for submission workflows.",
    icon: FileText
  }
];

const steps: Step[] = [
  {
    title: "Upload Documents",
    description: "Add project briefs, permits, baseline studies, prior EIAs, checklists, monitoring files, and supporting evidence.",
    icon: Upload
  },
  {
    title: "Build or Review with AI",
    description: "Generate structured sections, review against standards, and ask focused questions across the evidence base.",
    icon: Sparkles
  },
  {
    title: "Get Intelligent Insights",
    description: "Prioritize compliance gaps, impact logic issues, missing commitments, and weak source traceability.",
    icon: BarChart3
  },
  {
    title: "Export & Submit",
    description: "Prepare professional EIA packages, review responses, audit trails, and management-ready summaries.",
    icon: Send
  }
];

const benefits = [
  {
    title: "Faster EIA Preparation",
    value: "45%",
    description: "Reduce repetitive drafting, formatting, and cross-checking across large assessment packages.",
    icon: Zap
  },
  {
    title: "Higher Quality & Compliance",
    value: "92%",
    description: "Improve submission confidence with checklist review, source control, and governed content reuse.",
    icon: ShieldCheck
  },
  {
    title: "Reduced Review Cycles",
    value: "3x",
    description: "Resolve incomplete sections and repeated comments before the package reaches formal review.",
    icon: RefreshCcw
  },
  {
    title: "Better Environmental Outcomes",
    value: "24/7",
    description: "Keep commitments visible from assessment through implementation, monitoring, and audit readiness.",
    icon: Leaf
  }
];

const testimonials = [
  {
    quote:
      "EnviroQuant gives our EIA team one governed place to draft, review, and defend every decision with evidence.",
    name: "Mariam Al-Sabah",
    role: "Principal Environmental Consultant"
  },
  {
    quote:
      "The compliance review helps us catch missing commitments and weak mitigation language before the package reaches regulators.",
    name: "David Mercer",
    role: "HSE Manager, Energy Infrastructure"
  },
  {
    quote:
      "As a reviewer, I care about clarity, traceability, and repeatable quality. EnviroQuant makes those expectations visible.",
    name: "Eng. Farah Al-Kandari",
    role: "Environmental Review Lead"
  },
  {
    quote:
      "The knowledge library is practical. We reuse approved methods while still adapting them to the site and regulatory context.",
    name: "Omar Hassan",
    role: "Sustainability Program Director"
  }
];

const galleryImages = [
  {
    src: "https://images.unsplash.com/photo-1497435334941-8c899ee9e8e9?auto=format&fit=crop&w=900&q=80",
    alt: "Engineer inspecting solar energy infrastructure",
    title: "Clean Energy Assessments"
  },
  {
    src: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=900&q=80",
    alt: "Business intelligence dashboard with compliance charts and data visualizations",
    title: "Compliance Dashboards"
  },
  {
    src: "https://images.unsplash.com/photo-1517048676732-d65bc937f952?auto=format&fit=crop&w=900&q=80",
    alt: "Environmental consultants and technical reviewers collaborating in a meeting",
    title: "Expert Review Teams"
  }
];

const sectionImages = {
  aiWorkflow: {
    src: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1100&q=80",
    alt: "Digital earth visualization representing AI-powered environmental intelligence"
  },
  consultants: {
    src: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1000&q=80",
    alt: "Consultant using analytics dashboards for environmental assessment reporting"
  },
  reviewers: {
    src: "https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&w=1000&q=80",
    alt: "Professional reviewer checking compliance documents and reports"
  },
  knowledge: {
    src: "https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=1100&q=80",
    alt: "Professional team reviewing knowledge, standards, and project evidence on a board"
  },
  about: {
    src: "https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&w=1100&q=80",
    alt: "Professional environmental technology team planning a responsible intelligence strategy"
  }
};

const knowledgeItems = [
  "Approved mitigation language",
  "Impact pathway precedents",
  "Monitoring commitments",
  "Permit and standards library",
  "Reviewer response patterns",
  "Project-specific evidence maps"
];

function BrandMark({ dark = false }: { dark?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <span className="grid size-10 place-items-center rounded-full bg-[#8bd15f] text-sm font-black text-[#104a83] shadow-sm">
        EQ
      </span>
      <div className="leading-tight">
        <p className={`text-xl font-bold ${dark ? "text-slate-950" : "text-white"}`}>EnviroQuant</p>
        <p className={`text-xs font-semibold ${dark ? "text-slate-500" : "text-blue-100"}`}>EIA Builder</p>
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <Badge className="border-blue-200 bg-blue-50 text-blue-700">
      <span className="mr-2 size-1.5 rounded-full bg-[#8bd15f]" />
      {children}
    </Badge>
  );
}

function AnimatedPattern() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <svg className="absolute inset-x-0 top-0 h-full w-full opacity-70" viewBox="0 0 1200 700" fill="none" aria-hidden="true">
        <defs>
          <linearGradient id="eq-line" x1="0" y1="0" x2="1" y2="1">
            <stop stopColor="#2c76bd" stopOpacity="0.28" />
            <stop offset="1" stopColor="#8bd15f" stopOpacity="0.22" />
          </linearGradient>
        </defs>
        <path d="M20 160C180 88 322 232 488 170C650 108 740 78 890 138C1038 198 1110 112 1190 82" stroke="url(#eq-line)" strokeWidth="1.5" />
        <path d="M60 555C205 455 335 578 505 495C668 416 782 384 950 438C1065 476 1125 430 1185 390" stroke="url(#eq-line)" strokeWidth="1.2" />
        <path d="M210 96V252M488 170V495M890 138V438M1038 198V476" stroke="#2c76bd" strokeOpacity="0.12" />
        {[210, 488, 890, 1038].map((cx, index) => (
          <motion.circle
            key={cx}
            cx={cx}
            cy={[96, 170, 138, 198][index]}
            r="5"
            fill={index % 2 === 0 ? "#2c76bd" : "#8bd15f"}
            animate={{ opacity: [0.25, 0.9, 0.25], scale: [0.8, 1.3, 0.8] }}
            transition={{ duration: 3 + index * 0.4, repeat: Infinity, ease: "easeInOut" }}
          />
        ))}
      </svg>
      <motion.div
        className="absolute right-10 top-24 h-64 w-64 rounded-full bg-blue-200/40 blur-3xl"
        animate={{ x: [0, -18, 0], y: [0, 16, 0] }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute bottom-10 left-10 h-56 w-56 rounded-full bg-[#8bd15f]/25 blur-3xl"
        animate={{ x: [0, 20, 0], y: [0, -14, 0] }}
        transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  );
}

function DashboardMockup() {
  const readiness = [72, 84, 66, 91, 76, 88];

  return (
    <motion.div
      className="relative mx-auto w-full max-w-[650px]"
      initial={{ opacity: 0, y: 22 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease: "easeOut" }}
    >
      <div className="absolute -inset-4 rounded-xl bg-blue-200/50 blur-3xl" />
      <Card className="relative overflow-hidden">
        <div className="builder-topbar flex h-12 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <span className="size-2.5 rounded-full bg-red-300" />
            <span className="size-2.5 rounded-full bg-amber-200" />
            <span className="size-2.5 rounded-full bg-[#8bd15f]" />
          </div>
          <span className="hidden rounded-sm bg-white/15 px-3 py-1 text-xs font-bold text-blue-50 sm:inline-flex">
            Live EIA Workspace
          </span>
        </div>

        <div className="grid bg-white lg:grid-cols-[0.82fr_1.18fr]">
          <aside className="border-b border-slate-200 bg-white lg:border-b-0 lg:border-r">
            <div className="border-b border-slate-200 p-4">
              <div className="flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-md bg-blue-50 text-blue-700">
                  <FolderOpen className="size-5" />
                </span>
                <div>
                  <p className="font-bold text-slate-950">Coastal Energy Hub</p>
                  <p className="text-xs font-semibold text-slate-500">Environmental Impact Assessment</p>
                </div>
              </div>
            </div>

            <div className="py-3">
              {["Project Scope", "Baseline Evidence", "Impact Matrix", "Mitigation Plan", "Compliance Review"].map((item, index) => (
                <div
                  key={item}
                  className={`flex h-10 items-center justify-between border-b border-slate-100 px-4 text-sm font-semibold ${
                    index === 2 ? "bg-[#2c76bd] text-white" : "text-[#164577]"
                  }`}
                >
                  {item}
                  {index < 3 ? <CircleCheck className="size-4" /> : <span className="size-2 rounded-full bg-slate-300" />}
                </div>
              ))}
            </div>
          </aside>

          <div className="p-4">
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Readiness", value: "86%", icon: BadgeCheck },
                { label: "Open Gaps", value: "14", icon: FileCheck2 },
                { label: "Sources", value: "248", icon: Database }
              ].map((metric) => {
                const Icon = metric.icon;
                return (
                  <div key={metric.label} className="rounded-md border border-slate-200 bg-slate-50 p-3">
                    <Icon className="mb-3 size-4 text-blue-700" />
                    <p className="text-xl font-black text-slate-950">{metric.value}</p>
                    <p className="text-xs font-bold uppercase text-slate-500">{metric.label}</p>
                  </div>
                );
              })}
            </div>

            <div className="mt-4 rounded-md border border-slate-200 bg-white p-4">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="font-bold text-slate-950">Compliance Signal</p>
                  <p className="text-xs font-semibold text-slate-500">KEPA and KOC HSEMS alignment</p>
                </div>
                <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700">Strong</Badge>
              </div>
              <div className="flex h-28 items-end gap-2">
                {readiness.map((height, index) => (
                  <motion.span
                    key={index}
                    className="flex-1 rounded-t-sm bg-gradient-to-t from-[#2c76bd] to-[#8bd15f]"
                    initial={{ height: 12 }}
                    animate={{ height }}
                    transition={{ duration: 1.1, delay: index * 0.08, ease: "easeOut" }}
                  />
                ))}
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-md border border-slate-200 bg-blue-50 p-3">
                <CloudSun className="mb-2 size-5 text-blue-700" />
                <p className="text-sm font-bold text-slate-950">Air Quality Baseline</p>
                <p className="mt-1 text-xs leading-5 text-slate-600">3 missing monitoring references found.</p>
              </div>
              <div className="rounded-md border border-slate-200 bg-emerald-50 p-3">
                <Network className="mb-2 size-5 text-emerald-700" />
                <p className="text-sm font-bold text-slate-950">Evidence Traceability</p>
                <p className="mt-1 text-xs leading-5 text-slate-600">Critical claims linked to sources.</p>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}

function ThemedImageCard({ src, alt, title, subtitle }: { src: string; alt: string; title: string; subtitle: string }) {
  return (
    <Card className="group overflow-hidden">
      <div className="relative h-72">
        <Image
          src={src}
          alt={alt}
          fill
          unoptimized
          className="object-cover transition duration-700 group-hover:scale-105"
          sizes="(min-width: 1024px) 33vw, 100vw"
        />
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/80 to-transparent p-5 text-white">
          <p className="text-xs font-black uppercase text-blue-100">{subtitle}</p>
          <h3 className="mt-1 text-2xl font-bold">{title}</h3>
        </div>
      </div>
    </Card>
  );
}

function ProfileMenu({
  onLogout,
  user
}: {
  onLogout: () => void;
  user: User;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        className="flex min-w-0 items-center gap-2 rounded-md bg-white/10 px-3 py-1.5 text-left transition hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <UserCircle className="size-5 shrink-0 text-white" />
        <div className="hidden min-w-0 leading-tight xl:block">
          <p className="max-w-36 truncate text-sm font-semibold text-white">{user.full_name || "User"}</p>
          <p className="text-xs text-blue-100">{displayRole(user)}</p>
        </div>
        <ChevronDown className={`size-4 shrink-0 text-blue-100 transition ${open ? "rotate-180" : ""}`} />
      </button>

      {open ? (
        <div
          className="absolute right-0 mt-2 w-64 overflow-hidden rounded-md border border-slate-300 bg-white text-slate-900 shadow-workspace"
          role="menu"
        >
          <div className="border-b border-slate-200 p-4">
            <p className="truncate font-bold text-slate-950">{user.full_name || "User"}</p>
            <p className="mt-1 truncate text-sm text-slate-500">{user.email}</p>
          </div>
          <Link
            href="/dashboard"
            className="flex items-center gap-3 border-b border-slate-100 px-4 py-3 text-sm font-semibold text-blue-800 transition hover:bg-blue-50"
            role="menuitem"
            onClick={() => setOpen(false)}
          >
            <BarChart3 className="size-4" />
            Dashboard
          </Link>
          <Link
            href="/projects"
            className="flex items-center gap-3 border-b border-slate-100 px-4 py-3 text-sm font-semibold text-blue-800 transition hover:bg-blue-50"
            role="menuitem"
            onClick={() => setOpen(false)}
          >
            <FolderOpen className="size-4" />
            Projects
          </Link>
          <button
            type="button"
            className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onLogout();
            }}
          >
            <LogOut className="size-4" />
            Logout
          </button>
        </div>
      ) : null}
    </div>
  );
}

export function EnviroQuantLanding() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newsletterMessage, setNewsletterMessage] = useState("");
  const { user, loading: userLoading } = useCurrentUser();
  const [sessionUser, setSessionUser] = useState<User | null>(null);
  const [hasHydrated, setHasHydrated] = useState(false);
  const shouldReduceMotion = useReducedMotion();
  const showAuthenticatedState = hasHydrated && Boolean(sessionUser);
  const showSessionLoading = !hasHydrated || userLoading;
  const primaryCtaHref = showAuthenticatedState ? "/dashboard" : "/register";
  const primaryCtaLabel = showAuthenticatedState ? "Go to Dashboard" : "Register Organisation";

  const fadeUp = {
    hidden: { opacity: 0, y: shouldReduceMotion ? 0 : 22 },
    visible: { opacity: 1, y: 0 }
  };

  useEffect(() => {
    setHasHydrated(true);
  }, []);

  useEffect(() => {
    if (!hasHydrated) {
      return;
    }
    setSessionUser(user);
  }, [hasHydrated, user]);

  function handleNewsletterSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!email || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setNewsletterMessage("");
    window.setTimeout(() => {
      setIsSubmitting(false);
      setNewsletterMessage("You are on the EnviroQuant intelligence briefing list.");
      setEmail("");
    }, 900);
  }

  function handleLogout() {
    clearSession();
    setSessionUser(null);
    setIsMenuOpen(false);
  }

  return (
    <div className="min-h-screen overflow-hidden bg-[#edf3fb] text-slate-900">
      <header className="builder-topbar fixed inset-x-0 top-0 z-50 shadow-md">
        <nav className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8" aria-label="Primary navigation">
          <Link href="#" aria-label="EnviroQuant home" onClick={() => setIsMenuOpen(false)}>
            <BrandMark />
          </Link>

          <div className="hidden items-center gap-7 lg:flex">
            {navigation.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-sm px-1 py-1 text-sm font-semibold text-blue-50 transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
              >
                {item.label}
              </Link>
            ))}
          </div>

          <div className="hidden items-center gap-2 lg:flex">
            {showAuthenticatedState && sessionUser ? (
              <ProfileMenu user={sessionUser} onLogout={handleLogout} />
            ) : showSessionLoading ? (
              <div className="h-9 w-36 animate-pulse rounded-md bg-white/15" aria-label="Checking session" />
            ) : (
              <>
                <Button asChild size="sm" variant="secondary">
                  <Link href="/login">
                    <LogIn />
                    Log in
                  </Link>
                </Button>
                <Button asChild size="sm" className="bg-[#8bd15f] text-[#104a83] hover:bg-[#a4e374]">
                  <Link href="/register">
                    Register
                    <ArrowRight />
                  </Link>
                </Button>
              </>
            )}
          </div>

          <button
            type="button"
            className="inline-flex size-10 items-center justify-center rounded-md border border-white/25 text-white transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 lg:hidden"
            aria-label="Toggle navigation menu"
            aria-expanded={isMenuOpen}
            onClick={() => setIsMenuOpen((open) => !open)}
          >
            {isMenuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </nav>

        {isMenuOpen ? (
          <div className="border-t border-white/20 bg-[#164577] px-4 py-4 lg:hidden">
            <div className="mx-auto grid max-w-7xl gap-2">
              {navigation.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-md px-3 py-3 text-sm font-semibold text-blue-50 transition hover:bg-white/10"
                  onClick={() => setIsMenuOpen(false)}
                >
                  {item.label}
                </Link>
              ))}
              {showAuthenticatedState && sessionUser ? (
                <div className="mt-3 overflow-hidden rounded-md border border-white/20 bg-white/10">
                  <div className="flex items-center gap-3 border-b border-white/15 p-3">
                    <UserCircle className="size-7 text-white" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-white">{sessionUser.full_name || "User"}</p>
                      <p className="truncate text-xs text-blue-100">{displayRole(sessionUser)}</p>
                    </div>
                  </div>
                  <Link
                    href="/dashboard"
                    className="flex items-center gap-3 border-b border-white/10 px-3 py-3 text-sm font-semibold text-blue-50"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <BarChart3 className="size-4" />
                    Dashboard
                  </Link>
                  <button
                    type="button"
                    className="flex w-full items-center gap-3 px-3 py-3 text-left text-sm font-semibold text-blue-50"
                    onClick={handleLogout}
                  >
                    <LogOut className="size-4" />
                    Logout
                  </button>
                </div>
              ) : (
                <div className="mt-2 grid grid-cols-2 gap-3">
                  <Button asChild variant="secondary">
                    <Link href="/login" onClick={() => setIsMenuOpen(false)}>
                      Log in
                    </Link>
                  </Button>
                  <Button asChild className="bg-[#8bd15f] text-[#104a83] hover:bg-[#a4e374]">
                    <Link href="/register" onClick={() => setIsMenuOpen(false)}>
                      Register
                    </Link>
                  </Button>
                </div>
              )}
            </div>
          </div>
        ) : null}
      </header>

      <main>
        <section className="relative isolate min-h-screen overflow-hidden px-4 pb-16 pt-28 sm:px-6 lg:px-8 lg:pt-32">
          <AnimatedPattern />
          <div className="relative mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[0.9fr_1.1fr]">
            <motion.div initial="hidden" animate="visible" variants={fadeUp} transition={{ duration: 0.65, ease: "easeOut" }}>
              <SectionLabel>Current platform: structured EIA workflows</SectionLabel>
              <h1 className="mt-5 max-w-4xl text-5xl font-bold leading-[1.04] tracking-normal text-slate-950 sm:text-6xl lg:text-7xl">
                Environmental Intelligence Platform
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600 sm:text-xl">
                Create, evidence and review Environmental Impact Assessments in a secure, structured workspace built around traceability.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button asChild className="h-12 px-5 transition-all hover:-translate-y-0.5">
                  <Link href={primaryCtaHref}>
                    {primaryCtaLabel}
                    <ArrowRight />
                  </Link>
                </Button>
                <Button asChild className="h-12 px-5 transition-all hover:-translate-y-0.5" variant="secondary">
                  <Link href="#contact">
                    Book Demo
                    <ChevronRight />
                  </Link>
                </Button>
              </div>

              <div className="mt-9 grid max-w-xl grid-cols-3 gap-3">
                {[
                  ["Current", "Structured EIA"],
                  ["Principle", "Evidence Before Conclusions™"],
                  ["Roadmap", "Environmental Intelligence OS™"]
                ].map(([label, value]) => (
                  <Card key={label} className="p-4">
                    <p className="text-xs font-black uppercase tracking-[0.1em] text-[#287451]">{label}</p>
                    <p className="mt-1 text-xs font-semibold leading-5 text-slate-700">{value}</p>
                  </Card>
                ))}
              </div>
            </motion.div>

            <DashboardMockup />
          </div>
        </section>

        <section className="border-y border-slate-300 bg-white px-4 py-6 sm:px-6 lg:px-8" aria-label="Trusted by environmental leaders">
          <div className="mx-auto flex max-w-7xl flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <p className="text-sm font-black uppercase text-blue-700">Trusted by Environmental Leaders Worldwide</p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {logos.map((logo) => (
                <div
                  key={logo}
                  className="flex h-12 items-center justify-center rounded-md border border-slate-300 bg-slate-50 px-5 text-sm font-black text-slate-500 transition hover:-translate-y-0.5 hover:border-blue-400 hover:bg-blue-50 hover:text-blue-800"
                >
                  {logo}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="solutions" className="scroll-mt-24 px-4 py-24 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <motion.div
              className="mx-auto max-w-3xl text-center"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.25 }}
              variants={fadeUp}
              transition={{ duration: 0.55 }}
            >
              <SectionLabel>Platform Capabilities</SectionLabel>
              <h2 className="mt-4 text-3xl font-bold text-slate-950 sm:text-5xl">Built for Environmental Excellence</h2>
              <p className="mt-5 text-lg leading-8 text-slate-600">
                EnviroQuant brings expert environmental practice, regulatory context, and AI workflow automation into one familiar assessment workspace.
              </p>
            </motion.div>

            <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {features.map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <motion.article
                    key={feature.title}
                    className="builder-panel p-6 transition-all duration-300 hover:-translate-y-1 hover:border-blue-400 hover:bg-blue-50/30"
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, amount: 0.2 }}
                    variants={fadeUp}
                    transition={{ duration: 0.45, delay: index * 0.04 }}
                  >
                    <div className="mb-5 grid size-12 place-items-center rounded-md bg-blue-50 text-blue-700">
                      <Icon className="size-6" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-950">{feature.title}</h3>
                    <p className="mt-3 text-sm leading-6 text-slate-600">{feature.description}</p>
                  </motion.article>
                );
              })}
            </div>
          </div>
        </section>

        <section className="bg-white px-4 py-24 sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[0.92fr_1.08fr]">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.25 }}
              variants={fadeUp}
              transition={{ duration: 0.55 }}
            >
              <SectionLabel>Workflow</SectionLabel>
              <h2 className="mt-4 text-3xl font-bold text-slate-950 sm:text-5xl">How EnviroQuant Works</h2>
              <p className="mt-5 text-lg leading-8 text-slate-600">
                A guided path from raw project evidence to defensible environmental intelligence, without losing control of quality or traceability.
              </p>
              <Card className="mt-8 overflow-hidden">
                <Image
                  src={sectionImages.aiWorkflow.src}
                  alt={sectionImages.aiWorkflow.alt}
                  width={1100}
                  height={720}
                  unoptimized
                  className="h-72 w-full object-cover"
                />
              </Card>
            </motion.div>

            <div className="grid gap-4">
              {steps.map((step, index) => {
                const Icon = step.icon;
                return (
                  <motion.article
                    key={step.title}
                    className="builder-panel p-5 transition-all hover:-translate-y-0.5 hover:border-blue-400"
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, amount: 0.25 }}
                    variants={fadeUp}
                    transition={{ duration: 0.45, delay: index * 0.08 }}
                  >
                    <div className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className="grid size-12 shrink-0 place-items-center rounded-md bg-blue-50 text-blue-700">
                          <Icon className="size-6" />
                        </div>
                        {index < steps.length - 1 ? <span className="mt-3 h-10 w-px bg-slate-300" aria-hidden="true" /> : null}
                      </div>
                      <div>
                        <p className="text-sm font-black uppercase text-blue-700">Step {index + 1}</p>
                        <h3 className="mt-1 text-xl font-bold text-slate-950">{step.title}</h3>
                        <p className="mt-2 leading-7 text-slate-600">{step.description}</p>
                      </div>
                    </div>
                  </motion.article>
                );
              })}
            </div>
          </div>
        </section>

        <section className="px-4 py-24 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <motion.div
              className="mx-auto max-w-3xl text-center"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.25 }}
              variants={fadeUp}
              transition={{ duration: 0.55 }}
            >
              <SectionLabel>Dual Workflows</SectionLabel>
              <h2 className="mt-4 text-3xl font-bold text-slate-950 sm:text-5xl">Platform for Two Sides of Environmental Assurance</h2>
              <p className="mt-5 text-lg leading-8 text-slate-600">
                Consultants get a faster builder. Reviewers and regulators get a clearer, evidence-backed quality review experience.
              </p>
            </motion.div>

            <div className="mt-14 grid gap-6 lg:grid-cols-2">
              {[
                {
                  label: "For Consultants",
                  title: "EIA Builder",
                  description:
                    "Create structured assessments, manage specialist inputs, reuse approved content, and keep every chapter aligned to scope, evidence, and commitments.",
                  icon: FolderOpen,
                  image: sectionImages.consultants.src,
                  imageAlt: sectionImages.consultants.alt,
                  points: ["AI chapter drafting", "Impact matrices", "Versioned evidence", "Submission-ready exports"]
                },
                {
                  label: "For Reviewers & Regulators",
                  title: "Quality Review",
                  description:
                    "Review against regulatory frameworks, trace claims to source evidence, compare revisions, and generate clear requests for information.",
                  icon: ShieldCheck,
                  image: sectionImages.reviewers.src,
                  imageAlt: sectionImages.reviewers.alt,
                  points: ["Checklist review", "Gap detection", "Comment tracking", "Audit-ready decisions"]
                }
              ].map((side, index) => {
                const Icon = side.icon;
                return (
                  <motion.article
                    key={side.title}
                    className="builder-panel overflow-hidden transition-all hover:-translate-y-1 hover:border-blue-400"
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, amount: 0.2 }}
                    variants={fadeUp}
                    transition={{ duration: 0.55, delay: index * 0.08 }}
                  >
                    <div className="relative h-64">
                      <Image
                        src={side.image}
                        alt={side.imageAlt}
                        fill
                        unoptimized
                        className="object-cover"
                        sizes="(min-width: 1024px) 50vw, 100vw"
                      />
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/80 to-transparent p-5 text-white">
                        <div className="flex items-center gap-3">
                          <span className="grid size-12 place-items-center rounded-md bg-[#8bd15f] text-[#104a83]">
                            <Icon className="size-6" />
                          </span>
                          <div>
                            <p className="text-sm font-black uppercase text-blue-100">{side.label}</p>
                            <h3 className="text-2xl font-bold">{side.title}</h3>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="p-6">
                      <p className="leading-7 text-slate-600">{side.description}</p>
                      <div className="mt-6 grid gap-3 sm:grid-cols-2">
                        {side.points.map((point) => (
                          <div key={point} className="flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700">
                            <Check className="size-4 text-blue-700" />
                            {point}
                          </div>
                        ))}
                      </div>
                    </div>
                  </motion.article>
                );
              })}
            </div>
          </div>
        </section>

        <section id="knowledge-library" className="scroll-mt-24 bg-white px-4 py-24 sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[1.05fr_0.95fr]">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.25 }}
              variants={fadeUp}
              transition={{ duration: 0.55 }}
            >
              <SectionLabel>Knowledge Library</SectionLabel>
              <h2 className="mt-4 text-3xl font-bold text-slate-950 sm:text-5xl">Turn Institutional Knowledge Into Governed Intelligence</h2>
              <p className="mt-5 text-lg leading-8 text-slate-600">
                Store trusted technical language, reviewer responses, frameworks, permits, methods, and evidence references so every EIA starts from a stronger baseline.
              </p>
              <div className="mt-8 grid gap-3 sm:grid-cols-2">
                {knowledgeItems.map((item) => (
                  <div key={item} className="flex items-center gap-3 rounded-md border border-slate-300 bg-slate-50 p-3 text-sm font-semibold text-slate-700">
                    <CircleCheck className="size-5 shrink-0 text-blue-700" />
                    {item}
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.25 }}
              variants={fadeUp}
              transition={{ duration: 0.55, delay: 0.1 }}
            >
              <Card className="overflow-hidden">
                <Image
                  src={sectionImages.knowledge.src}
                  alt={sectionImages.knowledge.alt}
                  width={1100}
                  height={820}
                  unoptimized
                  className="h-[420px] w-full object-cover"
                />
                <div className="border-t border-slate-200 p-5">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-black uppercase text-blue-700">Library Match</p>
                      <h3 className="mt-1 text-xl font-bold text-slate-950">Marine ecology mitigation</h3>
                    </div>
                    <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700">96%</Badge>
                  </div>
                  <p className="text-sm leading-6 text-slate-600">Approved language found with 12 linked evidence sources and 4 prior reviewer responses.</p>
                </div>
              </Card>
            </motion.div>
          </div>
        </section>

        <section className="px-4 py-24 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <motion.div
              className="mx-auto max-w-3xl text-center"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.25 }}
              variants={fadeUp}
              transition={{ duration: 0.55 }}
            >
              <SectionLabel>Impact</SectionLabel>
              <h2 className="mt-4 text-3xl font-bold text-slate-950 sm:text-5xl">Measurable Gains for EIA Teams</h2>
              <p className="mt-5 text-lg leading-8 text-slate-600">
                EnviroQuant is built for teams that need speed, accuracy, defensibility, and better environmental decision-making.
              </p>
            </motion.div>

            <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {benefits.map((benefit, index) => {
                const Icon = benefit.icon;
                return (
                  <motion.article
                    key={benefit.title}
                    className="builder-panel p-6 transition-all duration-300 hover:-translate-y-1 hover:border-blue-400 hover:bg-blue-50/30"
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, amount: 0.25 }}
                    variants={fadeUp}
                    transition={{ duration: 0.45, delay: index * 0.06 }}
                  >
                    <Icon className="mb-6 size-8 text-blue-700" />
                    <p className="text-4xl font-black text-slate-950">{benefit.value}</p>
                    <h3 className="mt-4 text-lg font-bold text-slate-950">{benefit.title}</h3>
                    <p className="mt-3 text-sm leading-6 text-slate-600">{benefit.description}</p>
                  </motion.article>
                );
              })}
            </div>
          </div>
        </section>

        <section className="bg-white px-4 py-24 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <motion.div
              className="mx-auto max-w-3xl text-center"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.25 }}
              variants={fadeUp}
              transition={{ duration: 0.55 }}
            >
              <SectionLabel>Environmental Intelligence in Practice</SectionLabel>
              <h2 className="mt-4 text-3xl font-bold text-slate-950 sm:text-5xl">Premium Workflows for Complex Assessments</h2>
            </motion.div>
            <div className="mt-14 grid gap-5 lg:grid-cols-3">
              {galleryImages.map((image, index) => (
                <motion.div
                  key={image.title}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, amount: 0.2 }}
                  variants={fadeUp}
                  transition={{ duration: 0.45, delay: index * 0.06 }}
                >
                  <ThemedImageCard src={image.src} alt={image.alt} title={image.title} subtitle="EnviroQuant Context" />
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        <section className="px-4 py-24 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <motion.div
              className="mx-auto max-w-3xl text-center"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.25 }}
              variants={fadeUp}
              transition={{ duration: 0.55 }}
            >
              <SectionLabel>Testimonials</SectionLabel>
              <h2 className="mt-4 text-3xl font-bold text-slate-950 sm:text-5xl">Trusted by Teams Who Need Defensible Decisions</h2>
            </motion.div>

            <div className="mt-14 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
              {testimonials.map((testimonial, index) => (
                <motion.article
                  key={testimonial.name}
                  className="builder-panel p-5 transition-all duration-300 hover:-translate-y-1 hover:border-blue-400 hover:bg-blue-50/30"
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, amount: 0.2 }}
                  variants={fadeUp}
                  transition={{ duration: 0.45, delay: index * 0.05 }}
                >
                  <Quote className="mb-5 size-7 text-blue-700" />
                  <p className="text-sm leading-7 text-slate-600">&quot;{testimonial.quote}&quot;</p>
                  <div className="mt-6 border-t border-slate-200 pt-4">
                    <p className="font-bold text-slate-950">{testimonial.name}</p>
                    <p className="mt-1 text-sm text-slate-500">{testimonial.role}</p>
                  </div>
                </motion.article>
              ))}
            </div>
          </div>
        </section>

        <section id="about" className="scroll-mt-24 bg-white px-4 py-24 sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[0.92fr_1.08fr]">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.25 }}
              variants={fadeUp}
              transition={{ duration: 0.55 }}
            >
              <Card className="overflow-hidden">
                <Image
                  src={sectionImages.about.src}
                  alt={sectionImages.about.alt}
                  width={1100}
                  height={820}
                  unoptimized
                  className="h-[480px] w-full object-cover"
                />
                <div className="border-t border-slate-200 p-5">
                  <p className="text-sm font-black uppercase text-blue-700">Mission</p>
                  <p className="mt-2 text-xl font-bold leading-8 text-slate-950">Evidence-based environmental decisions at the speed modern projects require.</p>
                </div>
              </Card>
            </motion.div>

            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.25 }}
              variants={fadeUp}
              transition={{ duration: 0.55, delay: 0.1 }}
            >
              <SectionLabel>Our Philosophy</SectionLabel>
              <h2 className="mt-4 text-3xl font-bold text-slate-950 sm:text-5xl">Built From Dr. Hamad&apos;s Vision for Responsible Intelligence</h2>
              <p className="mt-6 text-lg leading-8 text-slate-600">
                EnviroQuant exists to help environmental professionals move beyond fragmented documents and manual review cycles. Inspired by Dr. Hamad&apos;s vision, the platform combines scientific rigor, practical regulatory experience, and AI-enabled quality control.
              </p>
              <p className="mt-5 text-lg leading-8 text-slate-600">
                We don&apos;t just build technology. We cultivate a sustainable future.
              </p>
              <div className="mt-8 grid gap-4 sm:grid-cols-3">
                {[
                  { icon: Globe2, label: "Global standards" },
                  { icon: Factory, label: "Industrial reality" },
                  { icon: CalendarCheck, label: "Defensible review" }
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <Card key={item.label} className="p-4">
                      <Icon className="mb-3 size-6 text-blue-700" />
                      <p className="font-bold text-slate-950">{item.label}</p>
                    </Card>
                  );
                })}
              </div>
            </motion.div>
          </div>
        </section>

        <section id="contact" className="scroll-mt-24 px-4 py-24 sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <motion.div
              className="builder-topbar relative overflow-hidden rounded-md border border-[#2c76bd] p-8 shadow-workspace sm:p-10"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.25 }}
              variants={fadeUp}
              transition={{ duration: 0.55 }}
            >
              <div className="absolute right-8 top-8 hidden size-28 rounded-full border border-white/20 lg:block" />
              <div className="relative">
                <Badge className="border-white/25 bg-white/15 text-blue-50">
                  <span className="mr-2 size-1.5 rounded-full bg-[#8bd15f]" />
                  Registration & demonstrations
                </Badge>
                <h2 className="mt-5 max-w-3xl text-3xl font-bold text-white sm:text-5xl">Build a more defensible EIA workflow.</h2>
                <p className="mt-5 max-w-2xl text-lg leading-8 text-blue-50">
                  Start with today’s structured EIA workspace. EnviroQuant is developed toward an Environmental Intelligence Operating System™.
                </p>
                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <Button asChild className="h-12 bg-[#8bd15f] px-5 text-[#104a83] hover:bg-[#a4e374]">
                    <Link href={primaryCtaHref}>
                      {primaryCtaLabel}
                      <ArrowRight />
                    </Link>
                  </Button>
                  <Button asChild className="h-12 px-5" variant="secondary">
                    <Link href="mailto:hello@enviroquant.ai">
                      Contact Sales
                      <Mail />
                    </Link>
                  </Button>
                </div>
              </div>
            </motion.div>

            <motion.div
              className="builder-panel p-6"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.25 }}
              variants={fadeUp}
              transition={{ duration: 0.55, delay: 0.1 }}
            >
              <div className="mb-6 flex items-center gap-3">
                <div className="grid size-12 place-items-center rounded-md bg-blue-50 text-blue-700">
                  <Mail className="size-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-950">Newsletter Signup</h3>
                  <p className="text-sm text-slate-600">Monthly environmental intelligence briefings.</p>
                </div>
              </div>
              <form className="space-y-4" onSubmit={handleNewsletterSubmit}>
                <label className="block text-sm font-bold text-slate-800" htmlFor="newsletter-email">
                  Work email
                </label>
                <Input
                  id="newsletter-email"
                  type="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@company.com"
                  className="h-12"
                />
                <Button type="submit" disabled={isSubmitting} className="h-12 w-full">
                  {isSubmitting ? <Loader2 className="animate-spin" /> : <Send />}
                  {isSubmitting ? "Submitting..." : "Subscribe"}
                </Button>
                {newsletterMessage ? <p className="text-sm font-semibold text-blue-700">{newsletterMessage}</p> : null}
              </form>
            </motion.div>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-300 bg-white px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1.2fr_0.8fr_0.8fr_0.8fr]">
          <div>
            <BrandMark dark />
            <p className="mt-5 max-w-sm leading-7 text-slate-600">
              AI-powered environmental intelligence for EIA builders, reviewers, regulators, and HSE leaders.
            </p>
            <div className="mt-6 flex gap-3">
              {[
                { label: "LinkedIn", icon: Linkedin },
                { label: "Twitter", icon: Twitter },
                { label: "Email", icon: Mail }
              ].map((social) => {
                const Icon = social.icon;
                return (
                  <Link
                    key={social.label}
                    href={social.label === "Email" ? "mailto:hello@enviroquant.ai" : "#"}
                    aria-label={social.label}
                    className="grid size-10 place-items-center rounded-md border border-slate-300 bg-slate-50 text-blue-700 transition hover:-translate-y-0.5 hover:border-blue-400 hover:bg-blue-50"
                  >
                    <Icon className="size-4" />
                  </Link>
                );
              })}
            </div>
          </div>

          <FooterColumn title="Platform" links={[["Solutions", "#solutions"], ["Knowledge Library", "#knowledge-library"], ["Book Demo", "#contact"]]} />
          <FooterColumn title="Company" links={[["About", "#about"], ["Log in", "/login"], ["Register", "/register"], ["Contact", "/contact"]]} />
          <div>
            <h3 className="font-bold text-slate-950">Contact</h3>
            <div className="mt-4 space-y-3 text-sm text-slate-600">
              <p>hello@enviroquant.ai</p>
              <p>Kuwait City, Kuwait</p>
              <p>Environmental intelligence and EIA compliance workflows.</p>
            </div>
          </div>
        </div>

        <div className="mx-auto mt-10 flex max-w-7xl flex-col gap-3 border-t border-slate-200 pt-6 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <p>Copyright 2026 EnviroQuant. All rights reserved.</p>
          <p>Built for environmental excellence.</p>
        </div>
      </footer>
    </div>
  );
}

function FooterColumn({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <div>
      <h3 className="font-bold text-slate-950">{title}</h3>
      <div className="mt-4 space-y-3 text-sm text-slate-600">
        {links.map(([label, href]) => (
          <Link key={label} className="block font-semibold transition hover:text-blue-800" href={href}>
            {label}
          </Link>
        ))}
      </div>
    </div>
  );
}
