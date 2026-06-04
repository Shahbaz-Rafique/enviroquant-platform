import type { Metadata } from "next";

import { HomeMarketingPage } from "@/components/site/marketing-pages";

export const generateMetadata = (): Metadata => {
  return {
    title: 'Home',
    description:
      'Revolutionize Environmental Impact Assessments with EnviroQuant — the AI-powered platform for faster, smarter, and globally compliant EIA processes.',
    openGraph: {
      title: 'EnviroQuant - The Future of EIA Management',
      description:
        'AI-assisted tools for EIA creation, compliance checking, and regulatory review.',
    },
  };
};

export default function HomePage() {
  return <HomeMarketingPage />;
}
