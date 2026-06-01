import type { Metadata } from "next";

import { ContactMarketingPage } from "@/components/site/marketing-pages";

export const metadata: Metadata = {
  title: "CompanyName | Contact",
  description: "Start a conversation about stewardship, restoration, and living systems design."
};

export default function ContactPage() {
  return <ContactMarketingPage />;
}