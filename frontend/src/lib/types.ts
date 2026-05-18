export type User = {
  id: string;
  tenant_id: string;
  email: string;
  full_name: string;
  status: string;
  role: string;
  roles: string[];
  permissions: string[];
  created_at: string;
  updated_at: string;
};

export type TokenResponse = {
  access_token: string;
  token_type: "bearer";
  user: User;
};

export type Project = {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  sector: string | null;
  country: string | null;
  location: string | null;
  status: string;
  project_metadata: Record<string, unknown>;
  created_by_id: string;
  created_at: string;
  updated_at: string;
};

export type DocumentVersion = {
  id: string;
  tenant_id: string;
  document_id: string;
  uploaded_by_id: string;
  version_number: number;
  storage_path: string;
  mime_type: string | null;
  size_bytes: number;
  checksum_sha256: string;
  parser_status: string;
  version_metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type ProjectDocument = {
  id: string;
  tenant_id: string;
  project_id: string;
  uploaded_by_id: string;
  current_version_id: string | null;
  original_filename: string;
  document_type: string;
  status: string;
  document_metadata: Record<string, unknown>;
  versions: DocumentVersion[];
  created_at: string;
  updated_at: string;
};
