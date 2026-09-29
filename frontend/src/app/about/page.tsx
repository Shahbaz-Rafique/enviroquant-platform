import type { Metadata } from "next";

import { AboutMarketingPage } from "@/components/site/marketing-pages";

export const metadata: Metadata = {
  title: 'About EnviroQuant',
  description:
    'EnviroQuant is an AI-powered Environmental Intelligence Platform that transforms how organisations create, review, and manage Environmental Impact Assessments.',
};

export default function AboutPage() {
  return <AboutMarketingPage />;
}