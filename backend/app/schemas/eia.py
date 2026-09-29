from datetime import date, datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field, field_validator

from app.schemas.common import ORMModel


class EiaEmailRequest(BaseModel):
    recipient: EmailStr
    subject: str = Field(default="EIA report", min_length=1, max_length=200, pattern=r"^[^\r\n]+$")
    message: str | None = Field(default=None, max_length=4000)
    format: Literal["docx", "pdf"] = "docx"


class EiaDocumentCreate(BaseModel):
    title: str | None = Field(default=None, min_length=2, max_length=220)
    metadata: dict = Field(default_factory=dict)
    source_document_id: UUID | None = None
    source_version_id: UUID | None = None
    auto_generate_sections: bool = False


class EiaSubSectionUpdate(BaseModel):
    content: str | None = Field(default=None, max_length=100_000)
    content_html: str | None = Field(default=None, max_length=500_000)
    content_json: dict | None = None
    completion_status: str | None = Field(default=None, max_length=40)
    progress_percentage: float | None = Field(default=None, ge=0, le=100)
    metadata: dict | None = None
    expected_updated_at: datetime | None = None


class EiaSubSectionContentUpdate(BaseModel):
    tenant_id: UUID | None = None
    content_html: str | None = Field(default=None, max_length=500_000)
    content_json: dict | None = None
    completion_status: str | None = Field(default=None, max_length=40)
    progress_percentage: float | None = Field(default=None, ge=0, le=100)
    change_summary: str | None = Field(default=None, max_length=500)
    expected_updated_at: datetime | None = None


class EiaSourceDocumentAttachmentCreate(BaseModel):
    tenant_id: UUID | None = None
    source_document_id: UUID
    source_version_id: UUID | None = None
    attachment_type: str = Field(default="legacy_eia_reference", max_length=80)
    checklist_reference: str | None = Field(default=None, max_length=40)


class EiaDocumentUserSummary(ORMModel):
    id: UUID
    email: str
    full_name: str
    status: str


class EiaDocumentMemberCreate(BaseModel):
    email: EmailStr
    full_name: str = Field(min_length=2, max_length=160)
    role: str = Field(default="VIEWER", max_length=50)

    @field_validator("role")
    @classmethod
    def normalize_role(cls, value: str) -> str:
        return value.upper()


class EiaDocumentMemberRead(ORMModel):
    id: UUID
    tenant_id: UUID
    eia_document_id: UUID
    user_id: UUID
    role: str
    user: EiaDocumentUserSummary
    created_at: datetime
    updated_at: datetime


class EiaDocumentMemberInvitationRead(ORMModel):
    member: EiaDocumentMemberRead
    invite_url: str | None = None
    email_sent: bool | None = None


class EiaAssignmentUpdate(BaseModel):
    author_user_id: UUID | None = None
    reviewer_user_id: UUID | None = None
    due_date: date | None = None
    is_blocked: bool = False
    blocked_reason: str | None = Field(default=None, max_length=1_000)

    @field_validator("blocked_reason")
    @classmethod
    def normalize_blocked_reason(cls, value: str | None) -> str | None:
        normalized = value.strip() if value else None
        return normalized or None


class EiaAssigneeSummaryRead(BaseModel):
    id: UUID
    full_name: str
    email: str
    status: str


class EiaSubSectionAssignmentRead(BaseModel):
    subsection_id: UUID
    subsection_number: str
    title: str
    completion_status: str
    progress_percentage: float
    review_status: str
    unresolved_comment_count: int
    last_updated_at: datetime | None = None
    last_updated_by_id: UUID | None = None
    last_updated_by: EiaAssigneeSummaryRead | None = None
    due_date: date | None = None
    is_overdue: bool = False
    is_blocked: bool = False
    blocked_reason: str | None = None
    assignment_source: Literal["SUBSECTION", "SECTION", "UNASSIGNED"]
    author_assignee: EiaAssigneeSummaryRead | None = None
    reviewer_assignee: EiaAssigneeSummaryRead | None = None
    current_role: Literal["AUTHOR", "REVIEWER", "UNASSIGNED"]
    current_assignee: EiaAssigneeSummaryRead | None = None


class EiaSectionAssignmentRead(BaseModel):
    section_id: UUID
    section_number: str
    title: str
    completion_status: str
    progress_percentage: float
    review_status: str
    unresolved_comment_count: int
    last_updated_at: datetime | None = None
    last_updated_by: EiaAssigneeSummaryRead | None = None
    has_assignment: bool = False
    due_date: date | None = None
    is_overdue: bool = False
    is_blocked: bool = False
    blocked_reason: str | None = None
    author_assignee: EiaAssigneeSummaryRead | None = None
    reviewer_assignee: EiaAssigneeSummaryRead | None = None
    current_role: Literal["AUTHOR", "REVIEWER", "UNASSIGNED"]
    current_assignee: EiaAssigneeSummaryRead | None = None
    subsections: list[EiaSubSectionAssignmentRead] = Field(default_factory=list)


class EiaAssignedWorkItemRead(BaseModel):
    section_id: UUID
    section_number: str
    section_title: str
    assignment_role: Literal["AUTHOR", "REVIEWER", "AUTHOR_AND_REVIEWER"]
    subsection: EiaSubSectionAssignmentRead


class EiaDocumentAssignmentsOverviewRead(BaseModel):
    eia_document_id: UUID
    sections: list[EiaSectionAssignmentRead] = Field(default_factory=list)
    my_assigned_work: list[EiaAssignedWorkItemRead] = Field(default_factory=list)


class EiaWorkflowTransitionRequest(BaseModel):
    target_status: Literal[
        "ASSIGNED",
        "IN_PROGRESS",
        "READY_FOR_REVIEW",
        "UNDER_REVIEW",
        "REVISION_REQUIRED",
        "APPROVED",
    ]
    comment: str | None = Field(default=None, max_length=20_000)

    @field_validator("comment")
    @classmethod
    def normalize_comment(cls, value: str | None) -> str | None:
        normalized = value.strip() if value else None
        return normalized or None


class EiaReviewQueueItemRead(BaseModel):
    section_id: UUID
    section_number: str
    section_title: str
    subsection_id: UUID
    subsection_number: str
    subsection_title: str
    status: Literal["READY_FOR_REVIEW", "UNDER_REVIEW"]
    progress_percentage: float
    submitted_at: datetime
    unresolved_comment_count: int
    author_assignee: EiaAssigneeSummaryRead | None = None
    reviewer_assignee: EiaAssigneeSummaryRead | None = None
    is_assigned_reviewer: bool = False
    can_approve_section: bool = False


class SubSectionCommentCreate(BaseModel):
    content: str = Field(min_length=1, max_length=20_000)
    parent_comment_id: UUID | None = None


class SubSectionCommentUpdate(BaseModel):
    is_resolved: bool


class SubSectionCommentRead(ORMModel):
    id: UUID
    tenant_id: UUID
    subsection_id: UUID
    user_id: UUID
    parent_comment_id: UUID | None
    content: str
    is_resolved: bool
    user: EiaDocumentUserSummary
    replies: list["SubSectionCommentRead"] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime


class EiaAttachmentRead(ORMModel):
    id: UUID
    tenant_id: UUID
    eia_document_id: UUID
    section_id: UUID | None
    subsection_id: UUID
    uploaded_by_id: UUID
    source_document_id: UUID | None
    original_filename: str
    storage_path: str
    mime_type: str | None
    size_bytes: int
    checksum_sha256: str
    attachment_type: str
    checklist_reference: str | None
    attachment_metadata: dict
    created_at: datetime
    updated_at: datetime


class SubSectionRevisionRead(ORMModel):
    id: UUID
    tenant_id: UUID
    eia_document_id: UUID
    subsection_id: UUID
    revision_number: int
    created_by_id: UUID | None
    source_mapping_id: UUID | None
    content: str
    content_html: str | None
    content_json: dict | None
    completion_status: str
    progress_percentage: float
    source_type: str
    change_summary: str | None
    revision_metadata: dict
    created_at: datetime
    updated_at: datetime


class EiaSourceDetectedSection(BaseModel):
    section_number: str | None = Field(default=None, max_length=40)
    title: str = Field(min_length=1, max_length=500)
    content: str | None = Field(default=None, max_length=500_000)
    confidence: float | None = Field(default=None, ge=0, le=1)
    metadata: dict = Field(default_factory=dict)


class EiaSourceMappingDetectRequest(BaseModel):
    source_document_id: UUID
    source_version_id: UUID | None = None
    detection_method: str = Field(default="rule_based", max_length=80)
    detected_sections: list[EiaSourceDetectedSection] = Field(default_factory=list)


class EiaSourceMappingConfirmRequest(BaseModel):
    apply_content: bool = False
    completion_status: str | None = Field(default=None, max_length=40)
    progress_percentage: float | None = Field(default=None, ge=0, le=100)
    expected_updated_at: datetime | None = None


class EiaSourceMappingRejectRequest(BaseModel):
    reason: str | None = Field(default=None, max_length=1000)


class EiaSourceMappingRead(BaseModel):
    id: UUID
    tenant_id: UUID
    eia_document_id: UUID
    source_document_id: UUID
    source_version_id: UUID | None
    subsection_id: UUID | None
    detected_section_number: str | None
    detected_title: str | None
    detected_content: str | None
    suggested_content_html: str | None
    confidence_score: float
    status: str
    detection_method: str
    assistant_notes: str | None
    confirmed_by_id: UUID | None
    confirmed_at: datetime | None
    mapping_metadata: dict
    subsection_number: str | None
    subsection_title: str | None
    source_document_filename: str
    source_version_number: int | None
    created_at: datetime
    updated_at: datetime


class EiaChecklistItemRead(ORMModel):
    id: UUID
    mapping_id: UUID | None = None
    subsection_id: UUID
    subsection_number: str
    title: str
    checklist_section: str
    checklist_title: str
    importance: str
    completion_status: str
    progress_percentage: float
    compliance_status: str


class EiaSubSectionRead(ORMModel):
    id: UUID
    tenant_id: UUID
    eia_document_id: UUID
    section_id: UUID
    subsection_number: str
    title: str
    content: str
    content_html: str | None = None
    content_json: dict | None = None
    completion_status: str
    progress_percentage: float
    display_order: int
    assigned_to_id: UUID | None
    last_edited_by_id: UUID | None = None
    last_edited_at: datetime | None = None
    content_metadata: dict
    created_at: datetime
    updated_at: datetime


class EiaSectionRead(ORMModel):
    id: UUID
    tenant_id: UUID
    eia_document_id: UUID
    section_number: str
    title: str
    display_order: int
    subsections: list[EiaSubSectionRead] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime


class EiaDocumentRead(ORMModel):
    id: UUID
    tenant_id: UUID
    project_id: UUID
    title: str
    status: str
    created_by_id: UUID
    document_metadata: dict
    created_at: datetime
    updated_at: datetime


class EiaDocumentStructureRead(EiaDocumentRead):
    sections: list[EiaSectionRead] = Field(default_factory=list)


class EiaSubSectionWorkspaceRead(ORMModel):
    subsection: EiaSubSectionRead
    project_id: UUID
    eia_document_id: UUID
    eia_document_title: str
    section_number: str
    section_title: str
    attachments: list[EiaAttachmentRead] = Field(default_factory=list)
    checklist_items: list[EiaChecklistItemRead] = Field(default_factory=list)


class EiaSectionProgressRead(BaseModel):
    section_id: UUID
    section_number: str
    title: str
    total_subsections: int
    completed_subsections: int
    in_progress_subsections: int
    progress_percentage: float


class EiaDocumentProgressRead(BaseModel):
    eia_document_id: UUID
    total_subsections: int
    completed_subsections: int
    in_progress_subsections: int
    progress_percentage: float
    sections: list[EiaSectionProgressRead] = Field(default_factory=list)


class EiaActivityActorRead(BaseModel):
    id: UUID
    full_name: str
    email: str


class EiaActivityItemRead(BaseModel):
    id: str
    type: Literal[
        "comment",
        "comment_resolved",
        "subsection_updated",
        "workflow_status_changed",
        "attachment_uploaded",
        "member_added",
    ]
    title: str
    description: str
    created_at: datetime
    actor: EiaActivityActorRead | None = None
    subsection_id: UUID | None = None
    subsection_number: str | None = None


class EiaEvaluationRunCreate(BaseModel):
    source_document_id: UUID | None = None
    source_version_id: UUID | None = None
    prompt_version: str | None = Field(default=None, max_length=60)


class EiaEvaluationEvidenceReferenceRead(BaseModel):
    chunk_id: str
    source_type: str
    document_chunk_id: UUID | None = None
    document_version_id: UUID | None = None
    subsection_id: UUID | None = None
    subsection_number: str | None = None
    excerpt: str | None = None
    page_number: int | None = None
    source_document_id: UUID | None = None
    source_document_filename: str | None = None


class EiaEvaluationFindingRead(ORMModel):
    id: UUID
    tenant_id: UUID
    evaluation_run_id: UUID
    subsection_id: UUID | None
    checklist_section: str
    checklist_title: str
    subsection_number: str | None
    subsection_title: str | None
    status: str
    adequacy: str
    confidence_score: float
    evidence_summary: str
    ai_analysis: str
    recommendation: str | None
    missing_elements: list[str] = Field(default_factory=list)
    evidence_references: list[EiaEvaluationEvidenceReferenceRead] = Field(default_factory=list)
    finding_metadata: dict = Field(default_factory=dict)
    created_at: datetime
    updated_at: datetime


class EiaEvaluationFindingDecision(BaseModel):
    decision: Literal["CLOSED", "RETAINED"]
    note: str | None = Field(default=None, max_length=4_000)


class EiaEvaluationSectionSummaryRead(ORMModel):
    id: UUID
    tenant_id: UUID
    evaluation_run_id: UUID
    section_number: str
    section_title: str
    findings_count: int
    compliant_count: int
    partially_compliant_count: int
    needs_improvement_count: int
    missing_count: int
    needs_review_count: int
    score: float
    summary_comment: str | None
    summary_metadata: dict = Field(default_factory=dict)
    created_at: datetime
    updated_at: datetime


class EiaEvaluationRunRead(ORMModel):
    id: UUID
    tenant_id: UUID
    project_id: UUID
    eia_document_id: UUID
    source_document_id: UUID | None
    source_version_id: UUID | None
    created_by_id: UUID
    status: str
    prompt_version: str
    model_version: str
    evaluation_scope: str
    started_at: datetime
    completed_at: datetime | None
    run_metadata: dict = Field(default_factory=dict)
    created_at: datetime
    updated_at: datetime


class EiaEvaluationRunDetailRead(EiaEvaluationRunRead):
    findings: list[EiaEvaluationFindingRead] = Field(default_factory=list)
    section_summaries: list[EiaEvaluationSectionSummaryRead] = Field(default_factory=list)


class EiaEvaluationFindingCommentCreate(BaseModel):
    content: str = Field(min_length=1, max_length=10_000)


class EiaEvaluationFindingCommentRead(ORMModel):
    id: UUID
    tenant_id: UUID
    evaluation_run_id: UUID
    finding_id: UUID
    user_id: UUID
    content: str
    user: EiaDocumentUserSummary
    created_at: datetime
    updated_at: datetime


class EiaEvaluationSectionComparisonRead(BaseModel):
    section_number: str
    section_title: str
    current_score: float
    baseline_score: float
    delta: float


class EiaEvaluationFindingComparisonRead(BaseModel):
    checklist_section: str
    checklist_title: str
    current_status: str
    baseline_status: str
    changed: bool


class EiaEvaluationComparisonRead(BaseModel):
    run_id: UUID
    baseline_run_id: UUID
    current_overall_score: float
    baseline_overall_score: float
    delta: float
    sections: list[EiaEvaluationSectionComparisonRead] = Field(default_factory=list)
    changed_findings: list[EiaEvaluationFindingComparisonRead] = Field(default_factory=list)


class EiaAuthoringAssistRequest(BaseModel):
    action: Literal["OUTLINE", "EVIDENCE_GAPS", "GENERATE_DRAFT", "IMPROVE_DRAFT"]
    instructions: str | None = Field(default=None, max_length=4_000)
    tenant_id: UUID | None = None


class EiaAuthoringAssistResponse(BaseModel):
    action: str
    engine: str
    model_version: str
    summary: str
    generated_html: str
    guidance_points: list[str] = Field(default_factory=list)
    metadata: dict = Field(default_factory=dict)


class EiaAutoStructureRequest(BaseModel):
    source_document_id: UUID
    source_version_id: UUID | None = None
    apply_detected_content: bool = True


class EiaReviewApprovalCreate(BaseModel):
    evaluation_run_id: UUID
    request_note: str | None = Field(default=None, max_length=10_000)


class EiaReviewApprovalDecision(BaseModel):
    decision: Literal["APPROVED", "CHANGES_REQUESTED"]
    decision_note: str | None = Field(default=None, max_length=10_000)


class EiaReviewApprovalRead(ORMModel):
    id: UUID
    tenant_id: UUID
    project_id: UUID
    eia_document_id: UUID
    evaluation_run_id: UUID
    requested_by_id: UUID
    decided_by_id: UUID | None
    status: str
    request_note: str | None
    decision_note: str | None
    requested_at: datetime
    decided_at: datetime | None
    approval_metadata: dict = Field(default_factory=dict)
    created_at: datetime
    updated_at: datetime


class EiaRegulatorBenchmarkItemRead(BaseModel):
    eia_document_id: UUID
    title: str
    document_status: str
    latest_run_id: UUID | None = None
    latest_score: float = 0.0
    latest_appraisal: str | None = None
    latest_run_completed_at: datetime | None = None
    approval_status: str | None = None


class EiaRegulatorTrendPointRead(BaseModel):
    run_id: UUID
    eia_document_id: UUID
    eia_document_title: str
    created_at: datetime
    completed_at: datetime | None = None
    overall_score: float = 0.0
    overall_appraisal: str | None = None


class EiaDocumentCrossComparisonRead(BaseModel):
    left_document_id: UUID
    right_document_id: UUID
    left_title: str
    right_title: str
    left_score: float
    right_score: float
    delta: float
    left_status_counts: dict = Field(default_factory=dict)
    right_status_counts: dict = Field(default_factory=dict)
    section_deltas: list[EiaEvaluationSectionComparisonRead] = Field(default_factory=list)


class EiaRegulatorOverviewRead(BaseModel):
    project_id: UUID
    benchmark_documents: list[EiaRegulatorBenchmarkItemRead] = Field(default_factory=list)
    trend_points: list[EiaRegulatorTrendPointRead] = Field(default_factory=list)
    recent_decisions: list[EiaReviewApprovalRead] = Field(default_factory=list)


SubSectionCommentRead.model_rebuild()
