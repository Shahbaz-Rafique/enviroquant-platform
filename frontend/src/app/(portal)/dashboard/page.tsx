"use client";

import { useAuth } from "@/components/auth/auth-provider";
import { ProjectsOverview } from "@/components/projects/projects-overview";


export default function DashboardPage() {
  const { user } = useAuth();

  if (!user) {
    return null;
  }

  return <ProjectsOverview user={user} />;
}
