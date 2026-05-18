import { FileText } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { ProjectDocument } from "@/lib/types";

type DocumentListProps = {
  documents: ProjectDocument[];
};

function formatBytes(bytes: number): string {
  if (bytes === 0) {
    return "0 B";
  }

  const units = ["B", "KB", "MB", "GB"];
  const index = Math.floor(Math.log(bytes) / Math.log(1024));
  const value = bytes / Math.pow(1024, index);
  return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[index]}`;
}

export function DocumentList({ documents }: DocumentListProps) {
  if (!documents.length) {
    return (
      <Card>
        <CardContent className="text-sm text-slate-600">No documents uploaded.</CardContent>
      </Card>
    );
  }

  return (
    <div className="divide-y divide-slate-200 rounded-md border border-slate-300 bg-white">
      {documents.map((document) => {
        const version = document.versions[0];
        return (
          <div className="grid gap-3 p-4 md:grid-cols-[minmax(0,1fr)_auto]" key={document.id}>
            <div className="flex min-w-0 items-start gap-3">
              <span className="mt-1 grid size-9 shrink-0 place-items-center rounded-md bg-blue-50 text-blue-700">
                <FileText className="size-5" />
              </span>
              <div className="min-w-0">
                <strong className="block truncate text-sm text-slate-950">{document.original_filename}</strong>
                <span className="mt-1 block truncate text-sm text-slate-500">
                  {version ? `Version ${version.version_number} · ${formatBytes(version.size_bytes)}` : "No version"}
                </span>
              </div>
            </div>
            <Badge className="justify-self-start md:justify-self-end">
              {version?.parser_status ?? document.status}
            </Badge>
          </div>
        );
      })}
    </div>
  );
}
