export type Organization = {
  id: string;
  name: string;
  slug: string;
  status: string;
  created_at: string;
  updated_at: string;
};

export type User = {
  id: string;
  tenant_id: string;
  organization_id: string;
  email: string;
  full_name: string;
  status: string;
  role: string;
  roles: string[];
  permissions: string[];
  organization: Organization | null;
  created_at: string;
  updated_at: string;
};

export type UserInvitation = {
  user: User;
  invite_url: string;
  expires_at: string;
  email_sent: boolean;
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

export type DocumentChunk = {
  id: string;
  tenant_id: string;
  project_id: string;
  document_id: string;
  document_version_id: string;
  chunk_index: number;
  chunk_key: string;
  page_number: number | null;
  section_number: string | null;
  section_title: string | null;
  heading_path: string[];
  content: string;
  content_metadata: Record<string, unknown>;
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

export type EiaSubSection = {
  id: string;
  tenant_id: string;
  eia_document_id: string;
  section_id: string;
  subsection_number: string;
  title: string;
  content: string;
  content_html: string | null;
  content_json: Record<string, unknown> | null;
  completion_status: string;
  progress_percentage: number;
  display_order: number;
  assigned_to_id: string | null;
  last_edited_by_id: string | null;
  last_edited_at: string | null;
  content_metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type EiaSection = {
  id: string;
  tenant_id: string;
  eia_document_id: string;
  section_number: string;
  title: string;
  display_order: number;
  subsections: EiaSubSection[];
  created_at: string;
  updated_at: string;
};

export type EiaDocument = {
  id: string;
  tenant_id: string;
  project_id: string;
  title: string;
  status: string;
  created_by_id: string;
  document_metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type EiaDocumentStructure = EiaDocument & {
  sections: EiaSection[];
};

export type EiaAttachment = {
  id: string;
  tenant_id: string;
  eia_document_id: string;
  section_id: string | null;
  subsection_id: string;
  uploaded_by_id: string;
  source_document_id: string | null;
  original_filename: string;
  storage_path: string;
  mime_type: string | null;
  size_bytes: number;
  checksum_sha256: string;
  attachment_type: string;
  checklist_reference: string | null;
  attachment_metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type EiaChecklistItem = {
  id: string;
  mapping_id: string | null;
  subsection_id: string;
  subsection_number: string;
  title: string;
  checklist_section: string;
  checklist_title: string;
  importance: "HIGH" | "MEDIUM" | "LOW" | string;
  completion_status: string;
  progress_percentage: number;
  compliance_status: "Compliant" | "Partially Compliant" | "Missing" | string;
};

export type EiaSubSectionWorkspace = {
  subsection: EiaSubSection;
  project_id: string;
  eia_document_id: string;
  eia_document_title: string;
  section_number: string;
  section_title: string;
  attachments: EiaAttachment[];
  checklist_items: EiaChecklistItem[];
};

export type EiaDocumentMember = {
  id: string;
  tenant_id: string;
  eia_document_id: string;
  user_id: string;
  role: "EDITOR" | "COMMENTER" | "VIEWER" | "REVIEWER" | string;
  user: Pick<User, "id" | "email" | "full_name" | "status">;
  created_at: string;
  updated_at: string;
};

export type EiaDocumentMemberInvitation = {
  member: EiaDocumentMember;
  invite_url: string | null;
  email_sent: boolean | null;
};

export type SubSectionComment = {
  id: string;
  tenant_id: string;
  subsection_id: string;
  user_id: string;
  parent_comment_id: string | null;
  content: string;
  is_resolved: boolean;
  user: Pick<User, "id" | "email" | "full_name" | "status">;
  replies: SubSectionComment[];
  created_at: string;
  updated_at: string;
};

export type SubSectionRevision = {
  id: string;
  tenant_id: string;
  eia_document_id: string;
  subsection_id: string;
  revision_number: number;
  created_by_id: string | null;
  source_mapping_id: string | null;
  content: string;
  content_html: string | null;
  content_json: Record<string, unknown> | null;
  completion_status: string;
  progress_percentage: number;
  source_type: string;
  change_summary: string | null;
  revision_metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type EiaSourceMapping = {
  id: string;
  tenant_id: string;
  eia_document_id: string;
  source_document_id: string;
  source_version_id: string | null;
  subsection_id: string | null;
  detected_section_number: string | null;
  detected_title: string | null;
  detected_content: string | null;
  suggested_content_html: string | null;
  confidence_score: number;
  status: "SUGGESTED" | "NEEDS_REVIEW" | "CONFIRMED" | "APPLIED" | "REJECTED" | string;
  detection_method: string;
  assistant_notes: string | null;
  confirmed_by_id: string | null;
  confirmed_at: string | null;
  mapping_metadata: Record<string, unknown>;
  subsection_number: string | null;
  subsection_title: string | null;
  source_document_filename: string;
  source_version_number: number | null;
  created_at: string;
  updated_at: string;
};

export type EiaSectionProgress = {
  section_id: string;
  section_number: string;
  title: string;
  total_subsections: number;
  completed_subsections: number;
  in_progress_subsections: number;
  progress_percentage: number;
};

export type EiaDocumentProgress = {
  eia_document_id: string;
  total_subsections: number;
  completed_subsections: number;
  in_progress_subsections: number;
  progress_percentage: number;
  sections: EiaSectionProgress[];
};

export type EiaActivityItem = {
  id: string;
  type: "comment" | "comment_resolved" | "subsection_updated" | "attachment_uploaded" | "member_added";
  title: string;
  description: string;
  created_at: string;
  actor: Pick<User, "id" | "email" | "full_name"> | null;
  subsection_id: string | null;
  subsection_number: string | null;
};

export type EiaEvaluationEvidenceReference = {
  chunk_id: string;
  source_type: string;
  document_chunk_id: string | null;
  document_version_id: string | null;
  subsection_id: string | null;
  subsection_number: string | null;
  excerpt: string | null;
  page_number: number | null;
  source_document_id: string | null;
  source_document_filename: string | null;
};

export type EiaEvaluationFinding = {
  id: string;
  tenant_id: string;
  evaluation_run_id: string;
  subsection_id: string | null;
  checklist_section: string;
  checklist_title: string;
  subsection_number: string | null;
  subsection_title: string | null;
  status:
    | "COMPLIANT"
    | "PARTIALLY_COMPLIANT"
    | "NEEDS_IMPROVEMENT"
    | "MISSING"
    | "NEEDS_REVIEW"
    | string;
  adequacy: string;
  confidence_score: number;
  evidence_summary: string;
  ai_analysis: string;
  recommendation: string | null;
  missing_elements: string[];
  evidence_references: EiaEvaluationEvidenceReference[];
  finding_metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type EiaEvaluationSectionSummary = {
  id: string;
  tenant_id: string;
  evaluation_run_id: string;
  section_number: string;
  section_title: string;
  findings_count: number;
  compliant_count: number;
  partially_compliant_count: number;
  needs_improvement_count: number;
  missing_count: number;
  needs_review_count: number;
  score: number;
  summary_comment: string | null;
  summary_metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type EiaEvaluationRun = {
  id: string;
  tenant_id: string;
  project_id: string;
  eia_document_id: string;
  source_document_id: string | null;
  source_version_id: string | null;
  created_by_id: string;
  status: "PENDING" | "RUNNING" | "COMPLETED" | "FAILED" | string;
  prompt_version: string;
  model_version: string;
  evaluation_scope: string;
  started_at: string;
  completed_at: string | null;
  run_metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type EiaEvaluationRunDetail = EiaEvaluationRun & {
  findings: EiaEvaluationFinding[];
  section_summaries: EiaEvaluationSectionSummary[];
};

export type EiaEvaluationFindingComment = {
  id: string;
  tenant_id: string;
  evaluation_run_id: string;
  finding_id: string;
  user_id: string;
  content: string;
  user: Pick<User, "id" | "email" | "full_name" | "status">;
  created_at: string;
  updated_at: string;
};

export type EiaEvaluationSectionComparison = {
  section_number: string;
  section_title: string;
  current_score: number;
  baseline_score: number;
  delta: number;
};

export type EiaEvaluationFindingComparison = {
  checklist_section: string;
  checklist_title: string;
  current_status: string;
  baseline_status: string;
  changed: boolean;
};

export type EiaEvaluationComparison = {
  run_id: string;
  baseline_run_id: string;
  current_overall_score: number;
  baseline_overall_score: number;
  delta: number;
  sections: EiaEvaluationSectionComparison[];
  changed_findings: EiaEvaluationFindingComparison[];
};
