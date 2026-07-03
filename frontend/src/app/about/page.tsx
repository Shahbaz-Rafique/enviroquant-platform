import type { Metadata } from "next";

import { AboutMarketingPage } from "@/components/site/marketing-pages";

export const metadata: Metadata = {
  title: "CompanyName | About",
  description: "The genesis of a movement built around symbiosis, purpose, and restorative creation."
};

export default function AboutPage() {
  return <AboutMarketingPage />;
}