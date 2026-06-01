import type { Metadata } from "next";

import { ServicesMarketingPage } from "@/components/site/marketing-pages";

export const metadata: Metadata = {
  title: "CompanyName | Services",
  description: "Living systems, ecological infrastructure, and regenerative technology services."
};

export default function ServicesPage() {
  return <ServicesMarketingPage />;
}