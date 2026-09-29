"use client";

import {
  ExternalLink,
  FileClock,
  FileText,
  FolderOpen,
  GitBranch,
  Layers3,
  Loader2,
  Search,
  UploadCloud
} from "lucide-react";
import Link from "next/link";
import { FormEvent, type ReactNode, useCallback, useEffect, useMemo, useState } from "react";

import { FileTrigger } from "@/components/ui/file-trigger";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileDropzone } from "@/components/ui/file-dropzone";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest } from "@/lib/api-client";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";
import type { DocumentVersion, Project, ProjectDocument, User } from "@/lib/types";

type DocumentLibraryManagerProps = {
  user: User;
};

const acceptedFiles = ".pdf,.doc,.docx,.csv,.xls,.xlsx,.txt,.gif,.jpeg,.jpg,.png,.webp";

const documentTypeLabels: Record<string, string> = {
  baseline_study: "Baseline Study",
  eia_report: "Current EIA Report",
  legacy_report: "Legacy Report",
  permit: "Permit",
  previous_eia: "Previous EIA",
  supporting_document: "Supporting Document"
};

function formatBytes(bytes: number): string {
  if (bytes <= 0) {
    return "0 B";
  }

  const units = ["B", "KB", "MB", "GB", "TB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / Math.pow(1024, index);
  return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[index]}`;
}

function formatDate(value: string | null | undefined): string {
  if (!value) {
    return "Unknown";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(date);
}

function getCurrentVersion(document: ProjectDocument): DocumentVersion | null {
  return document.versions[0] ?? null;
}

function documentTypeLabel(documentType: string): string {
  return documentTypeLabels[documentType] ?? documentType.replace(/_/g, " ");
}

export function DocumentLibraryManager({ user }: DocumentLibraryManagerProps) {
  const [documents, setDocuments] = useState<ProjectDocument[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [projectFilter, setProjectFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [selectedDocumentType, setSelectedDocumentType] = useState("supporting_document");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadingDocument, setUploadingDocument] = useState(false);
  const [uploadingVersions, setUploadingVersions] = useState<Record<string, boolean>>({});

  const canReadDocuments = hasPermission(user, PERMISSIONS.DOCUMENT_READ);
  const canUploadDocuments = hasPermission(user, PERMISSIONS.DOCUMENT_UPLOAD);
  const canCreateVersions = hasPermission(user, PERMISSIONS.DOCUMENT_VERSION_CREATE);

  const loadLibrary = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [documentData, projectData] = await Promise.all([
        apiRequest<ProjectDocument[]>("/documents"),
        apiRequest<Project[]>("/projects")
      ]);
      setDocuments(documentData);
      setProjects(projectData);
      setSelectedProjectId((current) => current || projectData[0]?.id || "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Library could not be loaded");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (canReadDocuments) {
      loadLibrary();
    }
  }, [canReadDocuments, loadLibrary]);

  const filteredDocuments = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return documents.filter((document) => {
      const projectName = document.project?.name?.toLowerCase() ?? "";
      const uploaderName = document.uploaded_by?.full_name?.toLowerCase() ?? "";
      const matchesSearch =
        normalizedSearch.length === 0 ||
        document.original_filename.toLowerCase().includes(normalizedSearch) ||
        projectName.includes(normalizedSearch) ||
        uploaderName.includes(normalizedSearch);

      const matchesProject = projectFilter === "all" || document.project_id === projectFilter;
      const matchesType = typeFilter === "all" || document.document_type === typeFilter;
      return matchesSearch && matchesProject && matchesType;
    });
  }, [documents, projectFilter, search, typeFilter]);

  const stats = useMemo(() => {
    const totalVersions = documents.reduce((count, document) => count + document.versions.length, 0);
    const activeProjects = new Set(documents.map((document) => document.project?.id ?? document.project_id));
    return {
      totalDocuments: documents.length,
      totalVersions,
      activeProjects: activeProjects.size
    };
  }, [documents]);

  async function handleNewDocumentSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canUploadDocuments) {
      return;
    }

    if (!selectedProjectId) {
      setUploadError("Choose a project for this library document.");
      return;
    }

    if (!selectedFile) {
      setUploadError("Choose a file to add into the library.");
      return;
    }

    const body = new FormData();
    body.append("file", selectedFile);
    body.append("document_type", selectedDocumentType);

    setUploadingDocument(true);
    setUploadError(null);

    try {
      await apiRequest<ProjectDocument>(`/projects/${selectedProjectId}/documents/upload`, {
        method: "POST",
        body
      });
      setSelectedFile(null);
      await loadLibrary();
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Library upload failed");
    } finally {
      setUploadingDocument(false);
    }
  }

  async function uploadVersion(documentId: string, file: File) {
    if (!canCreateVersions) {
      return;
    }

    const body = new FormData();
    body.append("file", file);
    setUploadingVersions((current) => ({ ...current, [documentId]: true }));
    setError(null);

    try {
      const updated = await apiRequest<ProjectDocument>(`/documents/${documentId}/versions`, {
        method: "POST",
        body
      });
      setDocuments((current) =>
        current
          .map((document) => (document.id === updated.id ? updated : document))
          .sort((left, right) => new Date(right.updated_at).getTime() - new Date(left.updated_at).getTime())
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Version upload failed");
    } finally {
      setUploadingVersions((current) => ({ ...current, [documentId]: false }));
    }
  }

  if (!canReadDocuments) {
    return null;
  }

  return (
    <div className="space-y-5">
      <header className="grid gap-4 xl:grid-cols-[1.3fr_0.7fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Library Management</CardTitle>
            <CardDescription>
              Shared document access for the whole team with version history tracked on every file.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-3">
            <StatCard
              icon={<FileText className="size-5" />}
              label="Documents"
              value={stats.totalDocuments.toString()}
            />
            <StatCard
              icon={<GitBranch className="size-5" />}
              label="Versions"
              value={stats.totalVersions.toString()}
            />
            <StatCard
              icon={<FolderOpen className="size-5" />}
              label="Projects"
              value={stats.activeProjects.toString()}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Access Model</CardTitle>
            <CardDescription>Tenant-scoped library access with project-linked document ownership.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-white/68">
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
              Every uploaded document remains linked to its project while staying visible in one shared team library.
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
              New versions replace nothing. Each upload is appended to the document timeline with uploader and timestamp.
            </div>
          </CardContent>
        </Card>
      </header>

      {canUploadDocuments ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UploadCloud className="size-5 text-[#B6F7FF]" />
              Add Document To Library
            </CardTitle>
            <CardDescription>Select the project, choose a document type, and upload the source file.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleNewDocumentSubmit}>
              {uploadError ? <Alert className="border-red-400/30 bg-red-500/10 text-red-100">{uploadError}</Alert> : null}
              <div className="grid gap-4 md:grid-cols-2">
                <label className="grid gap-2 text-sm font-semibold text-white/78">
                  Project
                  <Select disabled={uploadingDocument || !projects.length} value={selectedProjectId} onValueChange={setSelectedProjectId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose project" />
                    </SelectTrigger>
                    <SelectContent>
                      {projects.map((project) => (
                        <SelectItem key={project.id} value={project.id}>
                          {project.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </label>
                <label className="grid gap-2 text-sm font-semibold text-white/78">
                  Document type
                  <Select disabled={uploadingDocument} value={selectedDocumentType} onValueChange={setSelectedDocumentType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose type" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(documentTypeLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </label>
              </div>

              <FileDropzone
                accept={acceptedFiles}
                description="Drag and drop a document version here, or choose a file."
                disabled={uploadingDocument}
                file={selectedFile}
                onFileChange={setSelectedFile}
              />

              <div className="flex justify-end">
                <Button disabled={uploadingDocument || !selectedFile || !selectedProjectId} type="submit">
                  {uploadingDocument ? <Loader2 className="animate-spin" /> : <UploadCloud />}
                  Add To Library
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Document Library</CardTitle>
          <CardDescription>Search by file name, project, or uploader and inspect version history in place.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error ? <Alert className="border-red-400/30 bg-red-500/10 text-red-100">{error}</Alert> : null}
          {loading ? <Alert>Loading document library...</Alert> : null}

          <div className="grid gap-3 lg:grid-cols-[minmax(0,1.4fr)_0.8fr_0.8fr]">
            <label className="relative block">
              <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-white/38" />
              <Input
                className="h-11 rounded-2xl border border-white/12 bg-white/[0.04] pl-11 text-white placeholder:text-white/38"
                placeholder="Search documents, projects, or uploaders"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </label>

            <Select value={projectFilter} onValueChange={setProjectFilter}>
              <SelectTrigger className="h-11 rounded-2xl">
                <SelectValue placeholder="All projects" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All projects</SelectItem>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="h-11 rounded-2xl">
                <SelectValue placeholder="All types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                {Object.entries(documentTypeLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {!loading && !filteredDocuments.length ? (
            <Alert>No documents match the current search and filter selection.</Alert>
          ) : null}

          <div className="space-y-4">
            {filteredDocuments.map((document) => {
              const currentVersion = getCurrentVersion(document);
              const versionCount = document.versions.length;
              const versionUploadInProgress = Boolean(uploadingVersions[document.id]);

              return (
                <Card className="overflow-hidden" key={document.id}>
                  <CardContent className="space-y-4 p-0">
                    <div className="flex flex-col gap-4 border-b border-white/10 px-5 py-5 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="grid size-10 shrink-0 place-items-center rounded-2xl border border-[#67E8F9]/20 bg-[#67E8F9]/10 text-[#B6F7FF]">
                            <FileText className="size-5" />
                          </span>
                          <div className="min-w-0">
                            <h3 className="truncate text-lg font-semibold text-white">{document.original_filename}</h3>
                            <p className="mt-1 text-sm text-white/56">
                              {document.project?.name ?? "Unknown project"} · {documentTypeLabel(document.document_type)}
                            </p>
                          </div>
                        </div>

                        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                          <InfoChip
                            icon={<GitBranch className="size-4" />}
                            label="Current"
                            value={currentVersion ? `v${currentVersion.version_number}` : "No version"}
                          />
                          <InfoChip
                            icon={<Layers3 className="size-4" />}
                            label="Versions"
                            value={`${versionCount}`}
                          />
                          <InfoChip
                            icon={<FileClock className="size-4" />}
                            label="Updated"
                            value={formatDate(document.updated_at)}
                          />
                          <InfoChip
                            icon={<FolderOpen className="size-4" />}
                            label="Uploader"
                            value={document.uploaded_by?.full_name ?? "Unknown"}
                          />
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {currentVersion?.storage_path ? (
                          <Button asChild size="sm" variant="secondary">
                            <a href={currentVersion.storage_path} rel="noreferrer" target="_blank">
                              <ExternalLink />
                              Open Latest
                            </a>
                          </Button>
                        ) : null}
                        <Button asChild size="sm" variant="ghost">
                          <Link href={`/projects/${document.project_id}/documents`}>Project Files</Link>
                        </Button>
                        {canCreateVersions ? (
                          <FileTrigger
                            accept={acceptedFiles}
                            disabled={versionUploadInProgress}
                            size="sm"
                            title={`Upload new version for ${document.original_filename}`}
                            onFileSelect={(file) => {
                              void uploadVersion(document.id, file);
                            }}
                          >
                            {versionUploadInProgress ? <Loader2 className="animate-spin" /> : <UploadCloud />}
                            {versionUploadInProgress ? "Uploading..." : "New Version"}
                          </FileTrigger>
                        ) : null}
                      </div>
                    </div>

                    <details className="group px-5 pb-5">
                      <summary className="cursor-pointer list-none rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/[0.05]">
                        <span className="flex items-center justify-between gap-3">
                          <span>Version History</span>
                          <span className="text-white/52">{versionCount} tracked version{versionCount === 1 ? "" : "s"}</span>
                        </span>
                      </summary>
                      <div className="mt-3 space-y-3">
                        {document.versions.map((version) => (
                          <div
                            className="grid gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4 lg:grid-cols-[minmax(0,1fr)_auto]"
                            key={version.id}
                          >
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="rounded-full border border-[#8BD15F]/25 bg-[#8BD15F]/10 px-2.5 py-1 text-xs font-bold uppercase tracking-[0.16em] text-[#CBE9A0]">
                                  Version {version.version_number}
                                </span>
                                <span className="text-sm text-white/58">
                                  {formatBytes(version.size_bytes)} · {version.mime_type ?? "Unknown type"}
                                </span>
                              </div>
                              <p className="mt-3 text-sm text-white/66">
                                Uploaded by {version.uploaded_by?.full_name ?? "Unknown"} on {formatDate(version.uploaded_at ?? version.created_at)}
                              </p>
                              <p className="mt-1 text-xs text-white/44">
                                Parser status: {version.parser_status} · Chunks: {Number(version.version_metadata?.chunk_count ?? 0)}
                              </p>
                            </div>
                            <div className="flex flex-wrap gap-2 lg:justify-end">
                              <Button asChild size="sm" variant="secondary">
                                <a href={version.storage_path} rel="noreferrer" target="_blank">
                                  <ExternalLink />
                                  Open
                                </a>
                              </Button>
                              <Button asChild size="sm" variant="ghost">
                                <Link href={`/projects/${document.project_id}/documents`}>Manage</Link>
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </details>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-4">
      <div className="flex items-center gap-2 text-[#B6F7FF]">{icon}</div>
      <p className="mt-4 text-3xl font-bold text-white">{value}</p>
      <p className="mt-1 text-sm font-medium text-white/56">{label}</p>
    </div>
  );
}

function InfoChip({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-3">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-white/44">
        <span className="text-[#B6F7FF]">{icon}</span>
        {label}
      </div>
      <p className="mt-2 truncate text-sm font-semibold text-white">{value}</p>
    </div>
  );
}
