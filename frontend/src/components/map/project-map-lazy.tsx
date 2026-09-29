"use client";

import dynamic from "next/dynamic";

const ProjectMap = dynamic(
  () => import("./project-map").then((m) => m.ProjectMap),
  { ssr: false, loading: () => <div className="flex h-full w-full items-center justify-center text-sm text-[#9aaba3]">Loading map…</div> }
);

export { ProjectMap };
