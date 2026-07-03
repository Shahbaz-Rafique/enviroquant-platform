import type { Metadata } from "next";

import { HomeMarketingPage } from "@/components/site/marketing-pages";

export const metadata: Metadata = {
  title: "CompanyName | Home",
  description: "A regenerative brand system for living technologies and restorative design."
};

export default function HomePage() {
  return <HomeMarketingPage />;
}
