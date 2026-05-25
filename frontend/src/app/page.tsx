import type { Metadata } from "next";

import { EnviroQuantLanding } from "@/components/landing/enviroquant-landing";

export const metadata: Metadata = {
  title: "EnviroQuant | AI Environmental Intelligence Platform",
  description:
    "Develop, analyze, and manage Environmental Impact Assessments with AI-powered compliance intelligence, evidence traceability, and professional EIA reporting.",
  openGraph: {
    title: "EnviroQuant | AI Environmental Intelligence Platform",
    description:
      "A premium environmental intelligence platform for consultants, reviewers, regulators, and HSE teams managing Environmental Impact Assessments.",
    type: "website"
  }
};

export default function HomePage() {
  return <EnviroQuantLanding />;
}
