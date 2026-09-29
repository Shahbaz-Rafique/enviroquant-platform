import type { Metadata } from "next";

import { ServicesMarketingPage } from "@/components/site/marketing-pages";

export const metadata: Metadata = {
  title: "Services | EnviroQuant",
  description: "EIA Intelligence — structured EIA creation, AI-assisted compliance review, collaborative team workflows, and traceable evidence-based assessments."
};

export default function ServicesPage() {
  return <ServicesMarketingPage />;
}