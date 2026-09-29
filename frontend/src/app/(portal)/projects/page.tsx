"use client";

import { useAuth } from "@/components/auth/auth-provider";
import { ProjectsOverview } from "@/components/projects/projects-overview";


export default function ProjectsPage() {
  const { user } = useAuth();

  if (!user) {
    return null;
  }

  return <ProjectsOverview compact user={user} />;
}
