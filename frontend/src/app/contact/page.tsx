import type { Metadata } from "next";

import { ContactMarketingPage } from "@/components/site/marketing-pages";

export const metadata: Metadata = {
  title: "Contact | EnviroQuant",
  description: "Book a demo or get in touch to learn how EnviroQuant can streamline your Environmental Impact Assessment process."
};

export default function ContactPage() {
  return <ContactMarketingPage />;
}