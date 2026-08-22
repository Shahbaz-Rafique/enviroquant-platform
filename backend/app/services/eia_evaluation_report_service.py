from __future__ import annotations

from io import BytesIO
import json
from uuid import UUID

from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer
from sqlalchemy.orm import Session

from app.services.eia_evaluation_service import get_eia_evaluation_run


def _create_docx_document():
    try:
        from docx import Document as create_document
    except ModuleNotFoundError as exc:
        raise RuntimeError(
            "DOCX report generation requires python-docx to be installed in the backend environment."
        ) from exc

    return create_document()


def build_report_payload(db: Session, current_user, document_id: UUID, run_id: UUID) -> dict:
    run = get_eia_evaluation_run(db, current_user, document_id, run_id)
    return {
        "run": {
            "id": str(run.id),
            "status": run.status,
            "prompt_version": run.prompt_version,
            "model_version": run.model_version,
            "checklist_version": run.checklist_version,
            "methodology_version": run.methodology_version,
            "rules_version": run.rules_version,
            "scoring_enabled": run.run_metadata.get("scoring_enabled") is True,
            "overall_score": run.run_metadata.get("overall_score") if run.run_metadata.get("scoring_enabled") is True else None,
            "overall_appraisal": run.run_metadata.get("overall_appraisal") if run.run_metadata.get("scoring_enabled") is True else None,
        },
        "section_summaries": [
            {
                "section_number": summary.section_number,
                "section_title": summary.section_title,
                "score": summary.score if run.run_metadata.get("scoring_enabled") is True else None,
                "summary_comment": summary.summary_comment,
            }
            for summary in run.section_summaries
        ],
        "findings": [
            {
                "checklist_section": finding.checklist_section,
                "checklist_title": finding.checklist_title,
                "status": finding.status,
                "adequacy": finding.adequacy,
                "confidence_score": finding.confidence_score,
                "evidence_summary": finding.evidence_summary,
                "ai_analysis": finding.ai_analysis,
                "recommendation": finding.recommendation,
                "missing_elements": finding.missing_elements,
                "evidence_references": finding.evidence_references,
            }
            for finding in run.findings
        ],
    }


def build_report_json_bytes(db: Session, current_user, document_id: UUID, run_id: UUID) -> bytes:
    payload = build_report_payload(db, current_user, document_id, run_id)
    return json.dumps(payload, indent=2).encode("utf-8")


def build_report_docx_bytes(db: Session, current_user, document_id: UUID, run_id: UUID) -> bytes:
    run = get_eia_evaluation_run(db, current_user, document_id, run_id)
    document = _create_docx_document()
    document.add_heading("EnviroQuant Review Report", 0)
    document.add_paragraph(f"Run ID: {run.id}")
    document.add_paragraph(f"Status: {run.status}")
    document.add_paragraph(f"Checklist version: {run.checklist_version}")
    document.add_paragraph(f"Methodology: {run.methodology_version} / {run.rules_version}")
    if run.run_metadata.get("scoring_enabled") is True:
        document.add_paragraph(f"Overall score: {run.run_metadata.get('overall_score', 0)}/10")
        document.add_paragraph(f"Appraisal: {run.run_metadata.get('overall_appraisal', '-')}")

    document.add_heading("Section Summaries", level=1)
    for summary in run.section_summaries:
        document.add_heading(f"Section {summary.section_number} - {summary.section_title}", level=2)
        if run.run_metadata.get("scoring_enabled") is True:
            document.add_paragraph(f"Score: {summary.score}/10")
        if summary.summary_comment:
            document.add_paragraph(summary.summary_comment)

    document.add_heading("Findings", level=1)
    for finding in run.findings:
        document.add_heading(f"{finding.checklist_section} - {finding.checklist_title}", level=2)
        document.add_paragraph(f"Status: {finding.status}")
        document.add_paragraph(f"Adequacy: {finding.adequacy}")
        document.add_paragraph(f"Confidence: {round(finding.confidence_score * 100)}%")
        document.add_paragraph(f"Evidence summary: {finding.evidence_summary}")
        document.add_paragraph(f"Analysis: {finding.ai_analysis}")
        if finding.recommendation:
            document.add_paragraph(f"Recommendation: {finding.recommendation}")
        if finding.missing_elements:
            document.add_paragraph("Missing elements:")
            for item in finding.missing_elements:
                document.add_paragraph(item, style="List Bullet")

    buffer = BytesIO()
    document.save(buffer)
    return buffer.getvalue()


def build_report_pdf_bytes(db: Session, current_user, document_id: UUID, run_id: UUID) -> bytes:
    run = get_eia_evaluation_run(db, current_user, document_id, run_id)
    buffer = BytesIO()
    styles = getSampleStyleSheet()
    story = [
        Paragraph("EnviroQuant Review Report", styles["Title"]),
        Spacer(1, 12),
        Paragraph(f"Run ID: {run.id}", styles["Normal"]),
        Paragraph(f"Status: {run.status}", styles["Normal"]),
        Paragraph(f"Checklist version: {run.checklist_version}", styles["Normal"]),
        Paragraph(f"Methodology: {run.methodology_version} / {run.rules_version}", styles["Normal"]),
        Spacer(1, 12),
        Paragraph("Section Summaries", styles["Heading1"]),
    ]
    if run.run_metadata.get("scoring_enabled") is True:
        story[5:5] = [
            Paragraph(f"Overall score: {run.run_metadata.get('overall_score', 0)}/10", styles["Normal"]),
            Paragraph(f"Appraisal: {run.run_metadata.get('overall_appraisal', '-')}", styles["Normal"]),
        ]
    for summary in run.section_summaries:
        story.extend(
            [
                Paragraph(f"Section {summary.section_number} - {summary.section_title}", styles["Heading2"]),
                *(
                    [Paragraph(f"Score: {summary.score}/10", styles["Normal"])]
                    if run.run_metadata.get("scoring_enabled") is True
                    else []
                ),
                Paragraph(summary.summary_comment or "", styles["Normal"]),
                Spacer(1, 8),
            ]
        )
    story.append(Paragraph("Findings", styles["Heading1"]))
    for finding in run.findings:
        story.extend(
            [
                Paragraph(f"{finding.checklist_section} - {finding.checklist_title}", styles["Heading2"]),
                Paragraph(f"Status: {finding.status} | Adequacy: {finding.adequacy}", styles["Normal"]),
                Paragraph(finding.evidence_summary, styles["Normal"]),
                Paragraph(finding.ai_analysis, styles["Normal"]),
                Paragraph(f"Recommendation: {finding.recommendation or '-'}", styles["Normal"]),
                Spacer(1, 8),
            ]
        )
    doc = SimpleDocTemplate(buffer, pagesize=A4)
    doc.build(story)
    return buffer.getvalue()
