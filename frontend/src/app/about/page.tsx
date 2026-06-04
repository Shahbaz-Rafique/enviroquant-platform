import type { Metadata } from "next";

import { AboutMarketingPage } from "@/components/site/marketing-pages";

export const metadata: Metadata = {
  title: 'About EnviroQuant',
  description:
    'A modern Environmental Intelligence Platform that standardizes EIA creation and review processes for consultants and regulatory bodies worldwide.',
};

export default function AboutPage() {
  return <AboutMarketingPage />;
}