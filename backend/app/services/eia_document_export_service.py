from __future__ import annotations

import json
import logging
import re
import urllib.request
from datetime import datetime, timezone
from html import escape, unescape
from io import BytesIO
from uuid import UUID

logger = logging.getLogger(__name__)

from fastapi import HTTPException, status
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models.eia import EiaDocument, EiaSection, EiaSubSection
from app.models.eia_evaluation import EiaEvaluationRun
from app.models.project import Project
from app.models.user import User
from app.services.docx_charts import content_volume_chart, subsection_distribution_chart
from app.services.docx_content import append_editor_html
from app.services.executive_summary_service import generate_executive_summary
from app.services.eia_service import DOCUMENT_READ_ROLES, get_eia_document_progress, require_eia_document_permission


def _create_docx_document():
    try:
        from docx import Document as create_document
    except ModuleNotFoundError as exc:
        raise RuntimeError(
            "DOCX export requires python-docx to be installed in the backend environment."
        ) from exc
    return create_document()


def build_compiled_eia_payload(db: Session, current_user: User, document_id: UUID) -> dict[str, object]:
    document = _get_export_document(db, current_user, document_id)
    progress = get_eia_document_progress(db, current_user, document_id)
    latest_run = next((run for run in document.evaluation_runs if run.status == "COMPLETED"), None)
    attachments_by_subsection = _attachments_by_subsection(document)

    return {
        "document": {
            "id": str(document.id),
            "project_id": str(document.project_id),
            "title": document.title,
            "status": document.status,
            "metadata": document.document_metadata,
            "created_at": document.created_at.isoformat(),
            "updated_at": document.updated_at.isoformat(),
        },
        "project": _serialize_project(document.project),
        "progress": json.loads(progress.model_dump_json()),
        "latest_evaluation": _serialize_latest_evaluation(latest_run),
        "sections": [
            {
                "id": str(section.id),
                "section_number": section.section_number,
                "title": section.title,
                "subsections": [
                    {
                        "id": str(subsection.id),
                        "subsection_number": subsection.subsection_number,
                        "title": subsection.title,
                        "completion_status": subsection.completion_status,
                        "progress_percentage": subsection.progress_percentage,
                        "assigned_to_id": str(subsection.assigned_to_id) if subsection.assigned_to_id else None,
                        "last_edited_at": (
                            subsection.last_edited_at.isoformat() if subsection.last_edited_at else None
                        ),
                        "content": _export_content(subsection),
                        "content_html": subsection.content_html or subsection.content or "",
                        "attachments": [
                            {
                                "id": str(attachment.id),
                                "original_filename": attachment.original_filename,
                                "attachment_type": attachment.attachment_type,
                                "mime_type": attachment.mime_type,
                                "size_bytes": attachment.size_bytes,
                                "storage_path": attachment.storage_path,
                            }
                            for attachment in attachments_by_subsection.get(subsection.id, [])
                        ],
                    }
                    for subsection in section.subsections
                ],
            }
            for section in document.sections
        ],
    }


def build_compiled_eia_json_bytes(db: Session, current_user: User, document_id: UUID) -> bytes:
    payload = build_compiled_eia_payload(db, current_user, document_id)
    return json.dumps(payload, indent=2).encode("utf-8")


def build_compiled_eia_docx_bytes(
    db: Session, current_user: User, document_id: UUID, *, refresh_summary: bool = True
) -> bytes:
    from docx.enum.text import WD_ALIGN_PARAGRAPH
    from docx.shared import Cm, Inches, Pt

    # Keep the report summary in sync with the saved EIA. The summary service
    # returns its stored result when the source-content hash has not changed.
    if refresh_summary:
        generate_executive_summary(db, current_user, document_id)
    payload = build_compiled_eia_payload(db, current_user, document_id)
    doc = _create_docx_document()

    compiled_document = payload["document"]
    project = payload["project"]
    progress_data = payload["progress"]
    latest_evaluation = payload["latest_evaluation"]
    latest_run = None
    if latest_evaluation:
        export_document = _get_export_document(db, current_user, document_id)
        latest_run = next((run for run in export_document.evaluation_runs if run.status == "COMPLETED"), None)

    _setup_styles(doc)

    section = doc.sections[0]
    section.page_width = Cm(21)
    section.page_height = Cm(29.7)
    section.top_margin = Cm(2.54)
    section.bottom_margin = Cm(2.54)
    section.left_margin = Cm(3)
    section.right_margin = Cm(2.54)
    _add_running_header_and_page_numbers(section, str(compiled_document["title"]))

    if latest_run is not None:
        from app.services.eia_evaluation_report_service import _build_executive_dashboard_image

        opening = doc.add_paragraph()
        opening.alignment = WD_ALIGN_PARAGRAPH.CENTER
        opening.paragraph_format.space_after = 0
        opening.add_run().add_picture(_build_executive_dashboard_image(latest_run), width=Inches(6.5))
    else:
        _add_cover_page(doc, compiled_document, project, progress_data, latest_evaluation)
    doc.add_page_break()

    _add_document_control(doc, compiled_document, project)
    doc.add_page_break()

    _add_table_of_contents(doc, payload["sections"])
    doc.add_page_break()

    _add_executive_summary(doc, compiled_document, project, progress_data, latest_evaluation)
    _add_report_dashboard(doc, payload["sections"])
    _add_quality_and_compliance_snapshot(doc, latest_evaluation)
    doc.add_page_break()

    for section_data in payload["sections"]:
        heading = doc.add_heading(
            f"{section_data['section_number']}. {section_data['title']}",
            level=1
        )

        for subsection_data in section_data["subsections"]:
            doc.add_heading(
                f"{subsection_data['subsection_number']} {subsection_data['title']}",
                level=2
            )

            content_html = str(subsection_data.get("content_html", "")).strip()
            content_text = str(subsection_data.get("content", "")).strip()

            if content_html:
                append_editor_html(doc, content_html)
            elif content_text:
                for paragraph_text in _split_paragraphs(content_text):
                    doc.add_paragraph(paragraph_text)
            else:
                no_content = doc.add_paragraph()
                run = no_content.add_run("No content has been drafted for this subsection.")
                run.italic = True
                run.font.color.rgb = RGBColor(0x99, 0xAA, 0xA2)

            attachments = subsection_data.get("attachments", [])
            if attachments:
                doc.add_paragraph()
                ref_heading = doc.add_paragraph()
                ref_run = ref_heading.add_run("Supporting Evidence:")
                ref_run.bold = True
                ref_run.font.size = Pt(10)
                for attachment in attachments:
                    doc.add_paragraph(
                        f"{attachment['original_filename']} ({attachment['attachment_type']})",
                        style="List Bullet",
                    )

            doc.add_paragraph()

    _add_traceability_and_compliance_matrices(doc, latest_evaluation)
    _add_impact_mitigation_register(doc, latest_evaluation)
    _add_decision_readiness(doc, latest_evaluation)
    _add_evidence_register(doc, payload["sections"])
    _add_figures_and_tables_register(doc)

    _add_footer_info(doc, compiled_document)
    _apply_table_visual_system(doc)

    buffer = BytesIO()
    doc.save(buffer)
    return buffer.getvalue()


def _setup_styles(doc):
    from docx.oxml import OxmlElement
    from docx.oxml.ns import qn
    from docx.shared import Pt, RGBColor

    style = doc.styles["Normal"]
    font = style.font
    font.name = "Calibri"
    font.size = Pt(11)
    font.color.rgb = RGBColor(0x18, 0x37, 0x2C)
    paragraph_format = style.paragraph_format
    paragraph_format.space_after = Pt(6)
    paragraph_format.line_spacing = 1.15

    for level in range(1, 4):
        heading_style = doc.styles[f"Heading {level}"]
        heading_font = heading_style.font
        heading_font.name = "Calibri"
        heading_font.color.rgb = RGBColor(0x12, 0x3F, 0x2E)
        if level == 1:
            heading_font.size = Pt(18)
            heading_font.bold = True
            heading_font.color.rgb = RGBColor(0xFF, 0xFF, 0xFF)
            heading_style.paragraph_format.space_before = Pt(24)
            heading_style.paragraph_format.space_after = Pt(12)
            shading = OxmlElement("w:shd")
            shading.set(qn("w:fill"), "123F2E")
            heading_style.element.get_or_add_pPr().append(shading)
        elif level == 2:
            heading_font.size = Pt(14)
            heading_font.bold = True
            heading_style.paragraph_format.space_before = Pt(18)
            heading_style.paragraph_format.space_after = Pt(8)
        else:
            heading_font.size = Pt(12)
            heading_font.bold = True
            heading_style.paragraph_format.space_before = Pt(12)
            heading_style.paragraph_format.space_after = Pt(6)


def _add_cover_page(doc, compiled_document, project, progress_data, latest_evaluation):
    from docx.enum.text import WD_ALIGN_PARAGRAPH
    from docx.shared import Pt, RGBColor

    from docx.enum.table import WD_CELL_VERTICAL_ALIGNMENT

    cover = doc.add_table(rows=1, cols=1)
    cover.autofit = False
    cell = cover.cell(0, 0)
    cell.vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.CENTER
    _shade_docx_cell(cell, "062A22")
    cell.width = doc.sections[0].page_width - doc.sections[0].left_margin - doc.sections[0].right_margin

    eyebrow = cell.paragraphs[0]
    eyebrow.alignment = WD_ALIGN_PARAGRAPH.CENTER
    eyebrow_run = eyebrow.add_run("ENVIROQUANT™  •  ENVIRONMENTAL INTELLIGENCE PLATFORM")
    eyebrow_run.bold = True
    eyebrow_run.font.size = Pt(10)
    eyebrow_run.font.color.rgb = RGBColor(0x8B, 0xD1, 0x5F)

    for _ in range(3):
        cell.add_paragraph()

    title_para = cell.add_paragraph()
    title_para.alignment = WD_ALIGN_PARAGRAPH.CENTER
    title_run = title_para.add_run("ENVIRONMENTAL\nIMPACT ASSESSMENT")
    title_run.font.size = Pt(28)
    title_run.font.color.rgb = RGBColor(0xFF, 0xFF, 0xFF)
    title_run.bold = True
    title_run.font.name = "Calibri"

    doc_title = cell.add_paragraph()
    doc_title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    doc_title_run = doc_title.add_run(str(compiled_document["title"]))
    doc_title_run.font.size = Pt(16)
    doc_title_run.font.color.rgb = RGBColor(0x8B, 0xD1, 0x5F)
    doc_title_run.bold = True
    doc_title_run.font.name = "Calibri"

    project_para = cell.add_paragraph()
    project_para.alignment = WD_ALIGN_PARAGRAPH.CENTER
    proj_run = project_para.add_run(f"Project: {project['name']}")
    proj_run.font.size = Pt(13)
    proj_run.font.color.rgb = RGBColor(0xFF, 0xFF, 0xFF)

    location_text = str(project.get("country") or "Unspecified")
    if project.get("location"):
        location_text += f" — {project['location']}"
    loc_para = cell.add_paragraph()
    loc_para.alignment = WD_ALIGN_PARAGRAPH.CENTER
    loc_run = loc_para.add_run(f"Location: {location_text}")
    loc_run.font.size = Pt(11)
    loc_run.font.color.rgb = RGBColor(0xD8, 0xE7, 0xDF)

    if project.get("sector"):
        sector_para = cell.add_paragraph()
        sector_para.alignment = WD_ALIGN_PARAGRAPH.CENTER
        sector_run = sector_para.add_run(f"Sector: {project['sector']}")
        sector_run.font.size = Pt(11)
        sector_run.font.color.rgb = RGBColor(0xD8, 0xE7, 0xDF)

    for _ in range(3):
        cell.add_paragraph()

    date_para = cell.add_paragraph()
    date_para.alignment = WD_ALIGN_PARAGRAPH.CENTER
    date_run = date_para.add_run(f"Generated: {datetime.now(timezone.utc).strftime('%d %B %Y')}")
    date_run.font.size = Pt(10)
    date_run.font.color.rgb = RGBColor(0xD8, 0xE7, 0xDF)

    for _ in range(2):
        cell.add_paragraph()

    footer_para = cell.add_paragraph()
    footer_para.alignment = WD_ALIGN_PARAGRAPH.CENTER
    footer_run = footer_para.add_run("Prepared using EnviroQuant — AI-Powered EIA Platform")
    footer_run.font.size = Pt(9)
    footer_run.font.color.rgb = RGBColor(0x8B, 0xD1, 0x5F)
    footer_run.italic = True


def _add_table_of_contents(doc, sections):
    from docx.shared import Pt, RGBColor

    toc_heading = doc.add_heading("Table of Contents", level=1)

    for section_data in sections:
        toc_section = doc.add_paragraph()
        run = toc_section.add_run(f"{section_data['section_number']}. {section_data['title']}")
        run.bold = True
        run.font.size = Pt(11)
        run.font.color.rgb = RGBColor(0x12, 0x3F, 0x2E)

        for subsection_data in section_data["subsections"]:
            toc_sub = doc.add_paragraph()
            toc_sub.paragraph_format.left_indent = Pt(24)
            sub_run = toc_sub.add_run(
                f"{subsection_data['subsection_number']} {subsection_data['title']}"
            )
            sub_run.font.size = Pt(10)
            sub_run.font.color.rgb = RGBColor(0x52, 0x67, 0x5E)


def _add_document_control(doc, compiled_document, project):
    from docx.enum.table import WD_TABLE_ALIGNMENT, WD_CELL_VERTICAL_ALIGNMENT
    from docx.shared import Pt, RGBColor

    metadata = compiled_document.get("metadata") or {}
    doc.add_heading("Document Control", level=1)
    intro = doc.add_paragraph(
        "Professional issue, revision, responsibility and confidentiality record. "
        "Final issue remains subject to authorised human review and approval."
    )
    intro.runs[0].font.color.rgb = RGBColor(0x52, 0x67, 0x5E)

    table = doc.add_table(rows=0, cols=2)
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.style = "Table Grid"
    lat = project.get("latitude")
    lng = project.get("longitude")
    coord_text = f"{float(lat):.6f}°N, {float(lng):.6f}°E" if lat is not None and lng is not None else None

    fields = (
        ("Project", project.get("name") or "—"),
        ("Report", compiled_document.get("title") or "Environmental Impact Assessment"),
        ("Location", (project.get("location") or "") + (f"  [{coord_text}]" if coord_text else "") or "—"),
        ("Country / Jurisdiction", project.get("country") or "—"),
        ("Document number", metadata.get("document_number") or f"EQ-EIA-{str(compiled_document['id'])[:8].upper()}"),
        ("Revision", metadata.get("revision") or "Working draft"),
        ("Issue purpose", metadata.get("issue_purpose") or "Professional review and editing"),
        ("Classification", metadata.get("classification") or "Project controlled"),
    )
    for label, value in fields:
        cells = table.add_row().cells
        cells[0].text = str(label)
        cells[1].text = str(value)
        cells[0].paragraphs[0].runs[0].bold = True
        for cell in cells:
            cell.vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.CENTER

    doc.add_heading("Revision History", level=2)
    revision_table = doc.add_table(rows=1, cols=4)
    revision_table.style = "Table Grid"
    for index, label in enumerate(("Revision", "Date", "Description", "Decision")):
        revision_table.rows[0].cells[index].text = label
    revisions = metadata.get("revision_history") or []
    if revisions:
        for revision in revisions:
            cells = revision_table.add_row().cells
            cells[0].text = str(revision.get("revision") or "—")
            cells[1].text = str(revision.get("date") or "—")
            cells[2].text = str(revision.get("description") or "—")
            cells[3].text = str(revision.get("decision") or "—").replace("_", " ").title()
    else:
        cells = revision_table.add_row().cells
        cells[0].text = str(metadata.get("revision") or "Working draft")
        cells[1].text = datetime.now(timezone.utc).date().isoformat()
        cells[2].text = "Current generated working copy"
        cells[3].text = "Professional approval pending"

    doc.add_heading("Preparation and Approval", level=2)
    approval = doc.add_table(rows=1, cols=4)
    approval.style = "Table Grid"
    approval.alignment = WD_TABLE_ALIGNMENT.CENTER
    for index, label in enumerate(("Role", "Name / organisation", "Decision / signature", "Date")):
        approval.rows[0].cells[index].text = label
        approval.rows[0].cells[index].paragraphs[0].runs[0].bold = True
    for role in ("Prepared by", "Checked by", "Approved by"):
        cells = approval.add_row().cells
        cells[0].text = role
        cells[1].text = ""
        cells[2].text = ""
        cells[3].text = ""

    notice = doc.add_paragraph()
    notice.paragraph_format.space_before = Pt(10)
    run = notice.add_run(
        "AI supports evidence organisation, drafting and quality checks. It does not constitute regulatory approval "
        "or replace professional judgement."
    )
    run.italic = True
    run.font.size = Pt(9)
    run.font.color.rgb = RGBColor(0x69, 0x7A, 0x73)

    # Static map image if coordinates available
    lat = project.get("latitude")
    lng = project.get("longitude")
    if lat is not None and lng is not None:
        from docx.shared import Cm
        map_bytes = _fetch_static_map_image(float(lat), float(lng))
        if map_bytes:
            doc.add_heading("Project Site Location", level=2)
            loc_label = doc.add_paragraph()
            loc_run = loc_label.add_run(
                f"Coordinates: {float(lat):.6f}°N, {float(lng):.6f}°E"
                + (f"  |  {project['location']}" if project.get("location") else "")
            )
            loc_run.font.size = Pt(9)
            loc_run.font.color.rgb = RGBColor(0x52, 0x67, 0x5E)
            doc.add_picture(BytesIO(map_bytes), width=Cm(14))
            caption = doc.add_paragraph()
            cap_run = caption.add_run("Figure 1: Project site location (OpenStreetMap © OpenStreetMap contributors)")
            cap_run.italic = True
            cap_run.font.size = Pt(8)
            cap_run.font.color.rgb = RGBColor(0x9A, 0xAB, 0xA3)

def _add_executive_summary(doc, compiled_document, project, progress_data, latest_evaluation):
    from docx.shared import Pt, RGBColor

    doc.add_heading("Executive Summary", level=1)

    metadata = compiled_document.get("metadata") or {}
    ai_summary = metadata.get("ai_executive_summary") if isinstance(metadata, dict) else None
    if isinstance(ai_summary, dict) and str(ai_summary.get("html", "")).strip():
        append_editor_html(doc, str(ai_summary["html"]))
        return

    doc.add_paragraph(
        f"This Environmental Impact Assessment (EIA) document was prepared for the "
        f"\"{project['name']}\" project"
        + (f" located in {project.get('country', 'an unspecified location')}" if project.get("country") else "")
        + (f", sector: {project['sector']}" if project.get("sector") else "")
        + "."
    )

    if latest_evaluation:
        score = latest_evaluation.get("overall_score", "N/A")
        appraisal = latest_evaluation.get("overall_appraisal", "N/A")
        doc.add_paragraph(
            f"Latest Quality Review: Score {score}/10 — {appraisal}."
        )

    if project.get("description"):
        doc.add_paragraph()
        desc_heading = doc.add_paragraph()
        desc_run = desc_heading.add_run("Project Description")
        desc_run.bold = True
        doc.add_paragraph(str(project["description"]))

    doc.add_paragraph()
    disclaimer = doc.add_paragraph()
    disclaimer_run = disclaimer.add_run(
        "This report is compiled from saved assessment content and supporting references. "
        "Project facts, evidence, legal applicability and professional conclusions must be verified "
        "through the project quality-assurance process before controlled issue."
    )
    disclaimer_run.italic = True
    disclaimer_run.font.size = Pt(9)
    disclaimer_run.font.color.rgb = RGBColor(0x69, 0x7A, 0x73)


def _add_report_dashboard(doc, sections):
    from docx.enum.text import WD_ALIGN_PARAGRAPH
    from docx.shared import Inches, Pt, RGBColor

    doc.add_heading("Report Dashboard", level=1)
    intro = doc.add_paragraph(
        "The following charts summarize the size and structure of the compiled assessment. "
        "They describe report composition and do not represent environmental performance ratings."
    )
    intro.paragraph_format.space_after = Pt(12)

    for chart, alt_text in (
        (content_volume_chart(sections), "Horizontal bar chart showing word count for each EIA section."),
        (subsection_distribution_chart(sections), "Donut chart showing the number of subsections in each EIA section."),
    ):
        paragraph = doc.add_paragraph()
        paragraph.alignment = WD_ALIGN_PARAGRAPH.CENTER
        run = paragraph.add_run()
        shape = run.add_picture(chart, width=Inches(6.1))
        shape._inline.docPr.set("descr", alt_text)
        caption = doc.add_paragraph(alt_text)
        caption.alignment = WD_ALIGN_PARAGRAPH.CENTER
        caption.runs[0].italic = True
        caption.runs[0].font.size = Pt(8)
        caption.runs[0].font.color.rgb = RGBColor(0x69, 0x7A, 0x73)


def _add_quality_and_compliance_snapshot(doc, evaluation):
    doc.add_heading("Environmental Intelligence Snapshot", level=1)
    if not evaluation:
        doc.add_paragraph(
            "No completed RQEIA quality review is linked to this report. Quality, compliance and decision-readiness "
            "conclusions must therefore be established through a completed review before controlled issue."
        )
        table = doc.add_table(rows=2, cols=4)
        table.style = "Table Grid"
        for index, label in enumerate(("RQEIA quality", "Evidence coverage", "Open gaps", "Reviewer status")):
            table.rows[0].cells[index].text = label
            table.rows[0].cells[index].paragraphs[0].runs[0].bold = True
        for index, value in enumerate(("Not assessed", "Not assessed", "Review required", "Pending")):
            table.rows[1].cells[index].text = value
        return

    counts = evaluation.get("status_counts") or {}
    findings = evaluation.get("findings") or []
    total = len(findings)
    referenced = sum(1 for item in findings if item.get("references"))
    score = evaluation.get("overall_score")
    score_text = f"{round(float(score) * 10)}%" if score is not None else "Not calculated"
    rows = (
        ("RQEIA quality index", score_text),
        ("Overall appraisal", evaluation.get("overall_appraisal") or "Professional determination pending"),
        ("Requirements assessed", total),
        ("Evidence-linked findings", f"{referenced} of {total}"),
        ("Compliant", counts.get("COMPLIANT", 0)),
        ("Partial / needs improvement", counts.get("PARTIALLY_COMPLIANT", 0) + counts.get("NEEDS_IMPROVEMENT", 0)),
        ("Missing information", counts.get("MISSING", counts.get("MISSING_INFORMATION", 0))),
    )
    table = doc.add_table(rows=1, cols=2)
    table.style = "Table Grid"
    table.rows[0].cells[0].text = "Measure"
    table.rows[0].cells[1].text = "Current assessment"
    for cell in table.rows[0].cells:
        cell.paragraphs[0].runs[0].bold = True
    for label, value in rows:
        cells = table.add_row().cells
        cells[0].text = str(label)
        cells[1].text = str(value)

    actions = (evaluation.get("review_report") or {}).get("priority_actions") or []
    doc.add_heading("Priority Actions", level=2)
    if actions:
        for action in actions:
            doc.add_paragraph(str(action), style="List Bullet")
    else:
        doc.add_paragraph("No priority actions were recorded in the completed review.")


def _add_traceability_and_compliance_matrices(doc, evaluation):
    doc.add_page_break()
    doc.add_heading("Evidence Traceability Matrix", level=1)
    doc.add_paragraph(
        "This matrix preserves the audit path from requirement to evidence, assessment, gap and recommended action. "
        "A missing source is reported explicitly and is not inferred by the AI."
    )
    findings = (evaluation or {}).get("findings") or []
    trace = doc.add_table(rows=1, cols=8)
    trace.style = "Table Grid"
    for index, label in enumerate(("Requirement", "Evidence / source", "Assessment", "Finding status", "Gap", "Recommendation", "Reviewer decision", "Confidence")):
        trace.rows[0].cells[index].text = label
        trace.rows[0].cells[index].paragraphs[0].runs[0].bold = True
    for finding in findings:
        references = finding.get("references") or []
        source_parts = []
        for reference in references[:3]:
            source = reference.get("source_document_filename") or reference.get("subsection_number") or reference.get("source_type")
            page = f" p. {reference['page_number']}" if reference.get("page_number") else ""
            if source:
                source_parts.append(f"{source}{page}")
        cells = trace.add_row().cells
        cells[0].text = f"{finding.get('requirement_ref', '')} {finding.get('requirement', '')}".strip()
        cells[1].text = "; ".join(source_parts) or "Evidence not identified"
        cells[2].text = str(finding.get("assessment") or "Assessment not recorded")
        cells[3].text = str(finding.get("status") or "Needs review").replace("_", " ").title()
        cells[4].text = "; ".join(str(item) for item in (finding.get("gaps") or [])) or "No recorded gap"
        cells[5].text = str(finding.get("recommendation") or "No action recorded")
        cells[6].text = str(finding.get("reviewer_decision") or "Pending").replace("_", " ").title()
        confidence = finding.get("confidence")
        cells[7].text = f"{round(float(confidence) * 100)}%" if confidence is not None else "Not assessed"
    if not findings:
        cells = trace.add_row().cells
        for index, value in enumerate(("Review required", "Evidence not assessed", "Assessment pending", "Needs review", "Not established", "Complete RQEIA review", "Pending", "Not assessed")):
            cells[index].text = value

    doc.add_heading("Regulatory and Compliance Matrix", level=1)
    compliance = doc.add_table(rows=1, cols=6)
    compliance.style = "Table Grid"
    for index, label in enumerate(("Reference", "Requirement", "Applicability", "Evidence", "Assessment", "Required action")):
        compliance.rows[0].cells[index].text = label
        compliance.rows[0].cells[index].paragraphs[0].runs[0].bold = True
    for finding in findings:
        references = finding.get("references") or []
        cells = compliance.add_row().cells
        cells[0].text = str(finding.get("requirement_ref") or "Unreferenced")
        cells[1].text = str(finding.get("requirement") or "Requirement not recorded")
        cells[2].text = "Requires professional confirmation"
        cells[3].text = str(finding.get("evidence") or "Evidence not identified")
        cells[4].text = str(finding.get("status") or "Needs review").replace("_", " ").title()
        cells[5].text = str(finding.get("recommendation") or "No action recorded")
    if not findings:
        cells = compliance.add_row().cells
        for index, value in enumerate(("Pending", "Applicable requirements not yet assessed", "Requires professional confirmation", "Evidence not assessed", "Needs review", "Complete regulatory and RQEIA review")):
            cells[index].text = value


def _add_decision_readiness(doc, evaluation):
    doc.add_page_break()
    doc.add_heading("Conclusions and Decision Readiness", level=1)
    if not evaluation:
        doc.add_paragraph("Decision readiness has not been assessed because no completed RQEIA review is linked.")
    else:
        report = evaluation.get("review_report") or {}
        doc.add_paragraph(str(report.get("summary") or evaluation.get("overall_appraisal") or "Professional determination pending."))
    decisions = (evaluation or {}).get("reviewer_decisions") or []
    doc.add_heading("Authorised Reviewer Decision", level=2)
    table = doc.add_table(rows=1, cols=3)
    table.style = "Table Grid"
    for index, label in enumerate(("Decision", "Reviewer note", "Date")):
        table.rows[0].cells[index].text = label
        table.rows[0].cells[index].paragraphs[0].runs[0].bold = True
    if decisions:
        for decision in decisions:
            cells = table.add_row().cells
            cells[0].text = str(decision.get("status") or "Pending").replace("_", " ").title()
            cells[1].text = str(decision.get("decision_note") or "No decision note recorded")
            cells[2].text = str(decision.get("decided_at") or "Pending")
    else:
        cells = table.add_row().cells
        cells[0].text = "Pending authorised review"
        cells[1].text = "AI output is advisory and cannot approve or issue the EIA."
        cells[2].text = "Pending"


def _add_impact_mitigation_register(doc, evaluation):
    doc.add_page_break()
    doc.add_heading("Impact and Mitigation Register", level=1)
    doc.add_paragraph(
        "Actions are populated from recorded assessment findings. Ownership and due dates remain pending until assigned by the professional project team."
    )
    findings = (evaluation or {}).get("findings") or []
    relevant = [item for item in findings if str(item.get("subsection_number") or "").startswith(("6.", "7.", "8."))]
    table = doc.add_table(rows=1, cols=7)
    table.style = "Table Grid"
    for index, label in enumerate(("ID", "Assessment area", "Impact / finding", "Mitigation / action", "Status", "Owner", "Due")):
        table.rows[0].cells[index].text = label
    if relevant:
        for index, finding in enumerate(relevant, start=1):
            cells = table.add_row().cells
            values = (
                f"IM-{index:03d}", finding.get("requirement_ref") or "Unreferenced",
                finding.get("assessment") or finding.get("requirement") or "Finding not recorded",
                finding.get("recommendation") or "Action not recorded",
                str(finding.get("status") or "Needs review").replace("_", " ").title(),
                "To be assigned", "To be confirmed",
            )
            for cell, value in zip(cells, values):
                cell.text = str(value)
    else:
        cells = table.add_row().cells
        for cell, value in zip(cells, ("Pending", "RQEIA review", "Impacts not yet assessed", "Complete assessment before issue", "Open", "To be assigned", "To be confirmed")):
            cell.text = value


def _add_figures_and_tables_register(doc):
    doc.add_page_break()
    doc.add_heading("Figures and Tables Register", level=1)
    figure_table = doc.add_table(rows=1, cols=2)
    figure_table.style = "Table Grid"
    figure_table.rows[0].cells[0].text = "Figure"
    figure_table.rows[0].cells[1].text = "Title"
    for number, title in ((1, "Content volume by EIA section"), (2, "Distribution of subsections across the report")):
        cells = figure_table.add_row().cells
        cells[0].text = str(number)
        cells[1].text = title
    doc.add_paragraph(
        "Additional editor and evidence images are inserted within their source subsection and captioned during PDF generation."
    )


def _add_evidence_register(doc, sections):
    from docx.enum.table import WD_TABLE_ALIGNMENT

    evidence = []
    seen = set()
    for section in sections:
        for subsection in section["subsections"]:
            for attachment in subsection.get("attachments", []):
                key = attachment["id"]
                if key in seen:
                    continue
                seen.add(key)
                evidence.append((attachment, subsection))
    doc.add_page_break()
    doc.add_heading("Evidence Register", level=1)
    if not evidence:
        paragraph = doc.add_paragraph(
            "No subsection attachments are registered in this report snapshot. Evidence gaps must be resolved or "
            "formally accepted by the authorised reviewer before controlled issue."
        )
        paragraph.runs[0].italic = True
        return
    table = doc.add_table(rows=1, cols=5)
    table.style = "Table Grid"
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    for index, label in enumerate(("Evidence ID", "Document", "Type", "Used in", "File size")):
        table.rows[0].cells[index].text = label
        table.rows[0].cells[index].paragraphs[0].runs[0].bold = True
    for index, (attachment, subsection) in enumerate(evidence, start=1):
        cells = table.add_row().cells
        cells[0].text = f"EV-{index:04d}"
        cells[1].text = str(attachment["original_filename"])
        cells[2].text = str(attachment["attachment_type"])
        cells[3].text = str(subsection["subsection_number"])
        cells[4].text = _format_file_size(int(attachment["size_bytes"]))


def _format_file_size(size_bytes: int) -> str:
    if size_bytes >= 1024 * 1024:
        return f"{size_bytes / (1024 * 1024):.1f} MB"
    if size_bytes >= 1024:
        return f"{size_bytes / 1024:.1f} KB"
    return f"{size_bytes} B"


def _shade_docx_cell(cell, fill: str) -> None:
    from docx.oxml import OxmlElement
    from docx.oxml.ns import qn

    properties = cell._tc.get_or_add_tcPr()
    shading = properties.find(qn("w:shd"))
    if shading is None:
        shading = OxmlElement("w:shd")
        properties.append(shading)
    shading.set(qn("w:fill"), fill)


def _apply_table_visual_system(doc) -> None:
    from docx.shared import RGBColor

    for table_index, table in enumerate(doc.tables):
        if not table.rows:
            continue
        for row_index, row in enumerate(table.rows):
            fill = "123F2E" if row_index == 0 else ("F1F7F3" if row_index % 2 == 0 else "FFFFFF")
            for cell in row.cells:
                if table_index == 0:
                    fill = "062A22"
                _shade_docx_cell(cell, fill)
                for paragraph in cell.paragraphs:
                    for run in paragraph.runs:
                        if table_index == 0:
                            continue
                        if row_index == 0:
                            run.font.color.rgb = RGBColor(0xFF, 0xFF, 0xFF)
                            run.bold = True
                        elif table_index != 0:
                            run.font.color.rgb = RGBColor(0x18, 0x37, 0x2C)


def _add_running_header_and_page_numbers(section, title: str) -> None:
    from docx.enum.text import WD_ALIGN_PARAGRAPH
    from docx.oxml import OxmlElement
    from docx.oxml.ns import qn
    from docx.shared import Pt, RGBColor

    header = section.header
    header.is_linked_to_previous = False
    header_para = header.paragraphs[0]
    header_para.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    header_run = header_para.add_run(title)
    header_run.font.name = "Calibri"
    header_run.font.size = Pt(8)
    header_run.font.color.rgb = RGBColor(0x52, 0x67, 0x5E)
    footer = section.footer
    footer.is_linked_to_previous = False
    footer_para = footer.paragraphs[0]
    footer_para.alignment = WD_ALIGN_PARAGRAPH.CENTER
    footer_run = footer_para.add_run("EnviroQuant  •  Page ")
    footer_run.font.name = "Calibri"
    footer_run.font.size = Pt(8)
    footer_run.font.color.rgb = RGBColor(0x69, 0x7A, 0x73)
    _append_field(footer_para, "PAGE")
    footer_para.add_run(" of ")
    _append_field(footer_para, "NUMPAGES")


def _append_field(paragraph, instruction: str) -> None:
    from docx.oxml import OxmlElement
    from docx.oxml.ns import qn

    run = OxmlElement("w:r")
    begin = OxmlElement("w:fldChar")
    begin.set(qn("w:fldCharType"), "begin")
    code = OxmlElement("w:instrText")
    code.set(qn("xml:space"), "preserve")
    code.text = instruction
    separate = OxmlElement("w:fldChar")
    separate.set(qn("w:fldCharType"), "separate")
    text = OxmlElement("w:t")
    text.text = "1"
    end = OxmlElement("w:fldChar")
    end.set(qn("w:fldCharType"), "end")
    for element in (begin, code, separate, text, end):
        run.append(element)
    paragraph._p.append(run)


def _add_footer_info(doc, compiled_document):
    from docx.shared import Pt, RGBColor

    doc.add_paragraph()
    doc.add_paragraph()
    separator = doc.add_paragraph()
    sep_run = separator.add_run("—" * 40)
    sep_run.font.color.rgb = RGBColor(0xDC, 0xE6, 0xE1)

    footer = doc.add_paragraph()
    footer_run = footer.add_run(
        f"Document ID: {compiled_document['id']} | "
        f"Generated: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')} | "
        f"EnviroQuant EIA Platform"
    )
    footer_run.font.size = Pt(8)
    footer_run.font.color.rgb = RGBColor(0x9A, 0xAB, 0xA3)
    footer_run.italic = True


def _status_display(status_value: str) -> str:
    labels = {
        "NOT_STARTED": "Not Started",
        "ASSIGNED": "Assigned",
        "IN_PROGRESS": "In Progress",
        "READY_FOR_REVIEW": "Ready for Review",
        "UNDER_REVIEW": "Under Review",
        "REVISION_REQUIRED": "Revision Required",
        "APPROVED": "Approved",
        "COMPLETE": "Approved",
    }
    return labels.get(status_value, status_value.replace("_", " ").title())


def _status_color(status_value: str):
    from docx.shared import RGBColor
    colors = {
        "APPROVED": RGBColor(0x28, 0x74, 0x51),
        "COMPLETE": RGBColor(0x28, 0x74, 0x51),
        "IN_PROGRESS": RGBColor(0x28, 0x74, 0x51),
        "READY_FOR_REVIEW": RGBColor(0xB4, 0x83, 0x09),
        "UNDER_REVIEW": RGBColor(0xB4, 0x83, 0x09),
        "REVISION_REQUIRED": RGBColor(0xDC, 0x26, 0x26),
    }
    return colors.get(status_value, RGBColor(0x9A, 0xAB, 0xA3))


def build_compiled_eia_pdf_bytes(
    db: Session, current_user: User, document_id: UUID, *, refresh_summary: bool = True
) -> bytes:
    from reportlab.lib import colors
    from reportlab.lib.enums import TA_CENTER
    from reportlab.lib.styles import ParagraphStyle
    from reportlab.lib.units import mm
    from reportlab.platypus import Image, PageBreak, Table, TableStyle

    if refresh_summary:
        generate_executive_summary(db, current_user, document_id)
    payload = build_compiled_eia_payload(db, current_user, document_id)
    styles = getSampleStyleSheet()
    buffer = BytesIO()
    story = []

    compiled_document = payload["document"]
    project = payload["project"]
    latest_evaluation = payload["latest_evaluation"]
    latest_run = None
    if latest_evaluation:
        export_document = _get_export_document(db, current_user, document_id)
        latest_run = next((run for run in export_document.evaluation_runs if run.status == "COMPLETED"), None)

    dark = colors.HexColor("#062A22")
    green = colors.HexColor("#287451")
    lime = colors.HexColor("#8BD15F")
    pale = colors.HexColor("#F1F7F3")
    ink = colors.HexColor("#18372C")
    muted = colors.HexColor("#52675E")
    white = colors.white
    body_style = ParagraphStyle("EQ Body", parent=styles["BodyText"], fontName="Helvetica", fontSize=9.2, leading=13, textColor=ink, spaceAfter=6)
    small_style = ParagraphStyle("EQ Small", parent=body_style, fontSize=7.4, leading=9.5, textColor=muted)
    cover_brand = ParagraphStyle("EQ Cover Brand", parent=styles["Normal"], alignment=TA_CENTER, textColor=lime, fontName="Helvetica-Bold", fontSize=10, leading=14)
    cover_title = ParagraphStyle("EQ Cover Title", parent=styles["Title"], alignment=TA_CENTER, textColor=white, fontName="Helvetica-Bold", fontSize=27, leading=32)
    cover_subtitle = ParagraphStyle("EQ Cover Subtitle", parent=styles["Heading2"], alignment=TA_CENTER, textColor=lime, fontSize=15, leading=20)
    cover_detail = ParagraphStyle("EQ Cover Detail", parent=body_style, alignment=TA_CENTER, textColor=white, fontSize=10, leading=15)
    chapter_style = ParagraphStyle("EQ Chapter", parent=styles["Heading1"], textColor=white, fontName="Helvetica-Bold", fontSize=15, leading=19)
    subsection_style = ParagraphStyle("EQ Subsection", parent=styles["Heading2"], textColor=green, fontName="Helvetica-Bold", fontSize=11.5, leading=15, spaceBefore=10, spaceAfter=6)

    if latest_run is not None:
        from app.services.eia_evaluation_report_service import _build_executive_dashboard_image

        cover = Image(_build_executive_dashboard_image(latest_run), width=174 * mm, height=246 * mm)
    else:
        lat = project.get("latitude")
        lng = project.get("longitude")
        coord_str = f" [{float(lat):.5f}°N, {float(lng):.5f}°E]" if lat is not None and lng is not None else ""
        location = (
            f"{project['country'] or 'Location not recorded'}"
            + (f" / {project['location']}" if project["location"] else "")
            + coord_str
        )
        cover_content = [
            Paragraph("ENVIROQUANT™  •  ENVIRONMENTAL INTELLIGENCE PLATFORM", cover_brand),
            Spacer(1, 34 * mm),
            Paragraph("ENVIRONMENTAL IMPACT<br/>ASSESSMENT", cover_title),
            Spacer(1, 7 * mm),
            Paragraph(escape(str(compiled_document["title"])), cover_subtitle),
            Spacer(1, 13 * mm),
            Paragraph(f"<b>Project</b><br/>{escape(str(project['name']))}", cover_detail),
            Spacer(1, 4 * mm),
            Paragraph(f"<b>Location</b><br/>{escape(location)}", cover_detail),
            Spacer(1, 25 * mm),
            Paragraph(datetime.now(timezone.utc).strftime("%d %B %Y"), cover_detail),
            Spacer(1, 5 * mm),
            Paragraph("AI-assisted report • Subject to authorised professional approval", cover_brand),
        ]
        cover = Table([[cover_content]], colWidths=[174 * mm], rowHeights=[247 * mm])
        cover.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), dark),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("BOX", (0, 0), (-1, -1), 0, dark),
            ("LEFTPADDING", (0, 0), (-1, -1), 14 * mm),
            ("RIGHTPADDING", (0, 0), (-1, -1), 14 * mm),
        ]))
    story.extend([cover, PageBreak()])

    story.append(_pdf_chapter_banner("DOCUMENT CONTROL", "Professional issue, revision and responsibility record", chapter_style, small_style, dark, pale))
    metadata = compiled_document.get("metadata") or {}
    control_rows = [
        ["Field", "Information"],
        ["Project", project.get("name") or "Not recorded"],
        ["Report", compiled_document.get("title") or "Environmental Impact Assessment"],
        ["Document number", metadata.get("document_number") or f"EQ-EIA-{str(compiled_document['id'])[:8].upper()}"],
        ["Revision", metadata.get("revision") or "Working draft"],
        ["Issue purpose", metadata.get("issue_purpose") or "Professional review and editing"],
        ["Classification", metadata.get("classification") or "Project controlled"],
    ]
    story.extend([_pdf_table(control_rows, [45 * mm, 125 * mm], body_style, dark, pale), Spacer(1, 6 * mm)])

    story.append(_pdf_chapter_banner("EXECUTIVE ENVIRONMENTAL INTELLIGENCE", "Management summary and decision-readiness position", chapter_style, small_style, dark, pale))
    findings = (latest_evaluation or {}).get("findings") or []
    counts = (latest_evaluation or {}).get("status_counts") or {}
    score = (latest_evaluation or {}).get("overall_score")
    metric_rows = [["RQEIA QUALITY", "EVIDENCE-LINKED", "OPEN GAPS", "REVIEWER STATUS"], [
        f"{round(float(score) * 10)}%" if score is not None else "Not assessed",
        f"{sum(1 for item in findings if item.get('references'))} / {len(findings)}" if findings else "Not assessed",
        str(counts.get("MISSING", counts.get("MISSING_INFORMATION", "Review required"))),
        "Pending" if not (latest_evaluation or {}).get("reviewer_decisions") else str((latest_evaluation or {})["reviewer_decisions"][0].get("status", "Pending")),
    ]]
    story.extend([_pdf_table(metric_rows, [42.5 * mm] * 4, body_style, green, pale), Spacer(1, 5 * mm)])

    story.append(Paragraph("Report analytics", subsection_style))
    for chart_number, (chart, caption) in enumerate((
        (content_volume_chart(payload["sections"]), "Content volume by EIA section"),
        (subsection_distribution_chart(payload["sections"]), "Distribution of subsections across the report"),
    ), start=1):
        chart.seek(0)
        figure = Image(chart)
        figure._restrictSize(165 * mm, 88 * mm)
        figure.hAlign = "CENTER"
        story.extend([
            figure,
            Paragraph(f"Figure {chart_number}. {caption}", small_style),
            Spacer(1, 4 * mm),
        ])

    metadata = compiled_document.get("metadata") or {}
    ai_summary = metadata.get("ai_executive_summary") if isinstance(metadata, dict) else None
    if isinstance(ai_summary, dict) and ai_summary.get("html"):
        story.append(Paragraph("Executive Summary", subsection_style))
        for paragraph in _split_paragraphs(_html_to_text(str(ai_summary["html"]))):
            story.append(Paragraph(_pdf_safe_text(paragraph), body_style))
        story.append(Spacer(1, 12))

    story.append(Paragraph("Report structure", subsection_style))
    toc_rows = [["Section", "Title"]] + [[str(item["section_number"]), str(item["title"])] for item in payload["sections"]]
    story.extend([_pdf_table(toc_rows, [22 * mm, 148 * mm], body_style, dark, pale), PageBreak()])

    for section in payload["sections"]:
        story.append(_pdf_chapter_banner(f"{section['section_number']}  {section['title']}", "Structured EIA chapter", chapter_style, small_style, dark, pale))
        for subsection in section["subsections"]:
            story.append(
                Paragraph(
                    escape(f"{subsection['subsection_number']}  {subsection['title']}"),
                    subsection_style,
                )
            )
            content = str(subsection["content"]).strip() or "Information has not yet been provided for this subsection."
            for paragraph in _split_paragraphs(content):
                story.append(Paragraph(_pdf_safe_text(paragraph), body_style))
            for image_bytes, image_caption in _pdf_subsection_images(subsection):
                figure = Image(image_bytes)
                figure._restrictSize(165 * mm, 105 * mm)
                figure.hAlign = "CENTER"
                story.extend([figure, Paragraph(_pdf_safe_text(image_caption), small_style), Spacer(1, 4 * mm)])
            attachments = subsection["attachments"]
            if attachments:
                attachment_line = ", ".join(
                    f"{attachment['original_filename']} ({attachment['attachment_type']})"
                    for attachment in attachments
                )
                evidence_box = Table([[Paragraph(f"<b>Supporting evidence</b><br/>{_pdf_safe_text(attachment_line)}", small_style)]], colWidths=[170 * mm])
                evidence_box.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, -1), pale), ("BOX", (0, 0), (-1, -1), 0.5, green), ("PADDING", (0, 0), (-1, -1), 7)]))
                story.append(evidence_box)
            story.append(Spacer(1, 8))

    story.extend([PageBreak(), _pdf_chapter_banner("EVIDENCE TRACEABILITY & COMPLIANCE", "Requirement → Evidence → Assessment → Finding → Gap → Recommendation", chapter_style, small_style, dark, pale)])
    trace_rows = [["Requirement", "Source", "Finding", "Gap", "Action", "Decision"]]
    if findings:
        for finding in findings:
            refs = finding.get("references") or []
            sources = "; ".join(str(ref.get("source_document_filename") or ref.get("subsection_number") or ref.get("source_type") or "") for ref in refs[:2]) or "Evidence not identified"
            trace_rows.append([
                f"{finding.get('requirement_ref', '')} {finding.get('requirement', '')}".strip(), sources,
                str(finding.get("status") or "Needs review").replace("_", " ").title(),
                "; ".join(str(item) for item in (finding.get("gaps") or [])) or "No recorded gap",
                str(finding.get("recommendation") or "No action recorded"),
                str(finding.get("reviewer_decision") or "Pending").replace("_", " ").title(),
            ])
    else:
        trace_rows.append(["Review required", "Evidence not assessed", "Needs review", "Not established", "Complete RQEIA review", "Pending"])
    story.append(_pdf_table(trace_rows, [30 * mm, 29 * mm, 24 * mm, 31 * mm, 34 * mm, 22 * mm], small_style, dark, pale))

    story.extend([Spacer(1, 7 * mm), _pdf_chapter_banner("CONCLUSIONS & DECISION READINESS", "Professional determination and controlled issue status", chapter_style, small_style, dark, pale)])
    summary = ((latest_evaluation or {}).get("review_report") or {}).get("summary") or "Decision readiness has not been established. Complete the RQEIA review and authorised professional sign-off before controlled issue."
    story.append(Paragraph(_pdf_safe_text(str(summary)), body_style))
    decision_rows = [["Role", "Decision / signature", "Date"], ["EIA Lead", "Pending", ""], ["Independent Reviewer", "Pending", ""], ["Project Director", "Pending", ""]]
    story.append(_pdf_table(decision_rows, [50 * mm, 80 * mm, 40 * mm], body_style, dark, pale))

    pdf = SimpleDocTemplate(buffer, pagesize=A4, leftMargin=20 * mm, rightMargin=20 * mm, topMargin=19 * mm, bottomMargin=18 * mm, title=str(compiled_document["title"]), author="EnviroQuant")
    title = str(compiled_document["title"])
    pdf.build(
        story,
        onFirstPage=(lambda canvas, doc: None) if latest_run is not None else (lambda canvas, doc: _draw_pdf_header_footer(canvas, doc, title)),
        onLaterPages=lambda canvas, doc: _draw_pdf_header_footer(canvas, doc, title),
    )
    return buffer.getvalue()


def _pdf_chapter_banner(title, subtitle, title_style, subtitle_style, background, pale):
    from reportlab.platypus import Paragraph, Table, TableStyle

    content = [[Paragraph(escape(str(title)), title_style)], [Paragraph(escape(str(subtitle)), subtitle_style)]]
    table = Table(content, colWidths=[170 * 2.83465])
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), background),
        ("BACKGROUND", (0, 1), (-1, 1), pale),
        ("LEFTPADDING", (0, 0), (-1, -1), 10),
        ("RIGHTPADDING", (0, 0), (-1, -1), 10),
        ("TOPPADDING", (0, 0), (-1, 0), 9),
        ("BOTTOMPADDING", (0, 0), (-1, 0), 9),
        ("TOPPADDING", (0, 1), (-1, 1), 5),
        ("BOTTOMPADDING", (0, 1), (-1, 1), 5),
        ("BOX", (0, 0), (-1, -1), 0.5, background),
    ]))
    return table


def _pdf_table(rows, widths, text_style, header_background, alternate_background):
    from reportlab.lib import colors
    from reportlab.platypus import Paragraph, Table, TableStyle

    formatted = []
    for row in rows:
        formatted.append([Paragraph(_pdf_safe_text(str(value)), text_style) for value in row])
    table = Table(formatted, colWidths=widths, repeatRows=1, hAlign="LEFT")
    commands = [
        ("BACKGROUND", (0, 0), (-1, 0), header_background),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("GRID", (0, 0), (-1, -1), 0.35, colors.HexColor("#CFE0D7")),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 5),
        ("RIGHTPADDING", (0, 0), (-1, -1), 5),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]
    for row_index in range(2, len(rows), 2):
        commands.append(("BACKGROUND", (0, row_index), (-1, row_index), alternate_background))
    table.setStyle(TableStyle(commands))
    return table


def _pdf_subsection_images(subsection) -> list[tuple[BytesIO, str]]:
    import base64
    from urllib.parse import urlparse
    from urllib.request import Request, urlopen

    candidates: list[tuple[str, str]] = []
    html = str(subsection.get("content_html") or "")
    for match in re.finditer(r'<img[^>]+src=["\']([^"\']+)["\'][^>]*>', html, flags=re.IGNORECASE):
        candidates.append((unescape(match.group(1)), f"Figure in subsection {subsection['subsection_number']}"))
    for attachment in subsection.get("attachments") or []:
        if str(attachment.get("mime_type") or "").lower().startswith("image/"):
            candidates.append((str(attachment.get("storage_path") or ""), str(attachment.get("original_filename") or "Supporting image")))

    figures: list[tuple[BytesIO, str]] = []
    seen: set[str] = set()
    for source, caption in candidates:
        if not source or source in seen:
            continue
        seen.add(source)
        try:
            if source.startswith("data:image/") and ";base64," in source:
                raw = base64.b64decode(source.split(",", 1)[1], validate=True)
            else:
                parsed = urlparse(source)
                if parsed.scheme != "https" or parsed.hostname != "res.cloudinary.com":
                    continue
                request = Request(source, headers={"User-Agent": "EnviroQuant report exporter"})
                with urlopen(request, timeout=10) as response:
                    content_type = str(response.headers.get("content-type") or "").lower()
                    if not content_type.startswith("image/"):
                        continue
                    raw = response.read(15 * 1024 * 1024 + 1)
                if len(raw) > 15 * 1024 * 1024:
                    continue
            figures.append((BytesIO(raw), caption))
        except (OSError, ValueError, base64.binascii.Error):
            continue
    return figures


def _draw_pdf_header_footer(canvas, doc, title: str) -> None:
    from reportlab.lib.colors import HexColor

    canvas.saveState()
    canvas.setFillColor(HexColor("#52675E"))
    canvas.setFont("Helvetica", 8)
    canvas.drawRightString(A4[0] - 42, A4[1] - 28, title[:90])
    canvas.setFillColor(HexColor("#697A73"))
    canvas.drawCentredString(A4[0] / 2, 24, f"EnviroQuant  •  Page {doc.page}")
    canvas.restoreState()


def _get_export_document(db: Session, current_user: User, document_id: UUID) -> EiaDocument:
    document = db.scalar(
        select(EiaDocument)
        .options(
            selectinload(EiaDocument.project),
            selectinload(EiaDocument.members),
            selectinload(EiaDocument.attachments),
            selectinload(EiaDocument.sections).selectinload(EiaSection.subsections),
            selectinload(EiaDocument.evaluation_runs).selectinload(EiaEvaluationRun.findings),
            selectinload(EiaDocument.evaluation_runs).selectinload(EiaEvaluationRun.section_summaries),
            selectinload(EiaDocument.evaluation_runs).selectinload(EiaEvaluationRun.review_approvals),
        )
        .where(EiaDocument.id == document_id, EiaDocument.tenant_id == current_user.tenant_id)
    )
    if document is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="EIA document not found")
    require_eia_document_permission(document, current_user, DOCUMENT_READ_ROLES, "export")
    return document


def _fetch_static_map_image(latitude: float, longitude: float, width: int = 600, height: int = 300, zoom: int = 10) -> bytes | None:
    """Fetch a static map tile from OpenStreetMap via staticmap.de (no API key needed)."""
    try:
        url = (
            f"https://staticmap.openstreetmap.de/staticmap.php"
            f"?center={latitude},{longitude}&zoom={zoom}&size={width}x{height}"
            f"&markers={latitude},{longitude},red-pushpin"
        )
        req = urllib.request.Request(url, headers={"User-Agent": "EnviroQuant/1.0"})
        with urllib.request.urlopen(req, timeout=8) as response:
            return response.read()
    except Exception as exc:
        logger.warning("Static map fetch failed: %s", exc)
        return None


def _serialize_project(project: Project) -> dict[str, object]:
    return {
        "id": str(project.id),
        "name": project.name,
        "description": project.description,
        "sector": project.sector,
        "country": project.country,
        "location": project.location,
        "latitude": project.latitude,
        "longitude": project.longitude,
        "status": project.status,
        "metadata": project.project_metadata,
    }


def _serialize_latest_evaluation(run: EiaEvaluationRun | None) -> dict[str, object] | None:
    if run is None:
        return None
    return {
        "id": str(run.id),
        "status": run.status,
        "completed_at": run.completed_at.isoformat() if run.completed_at else None,
        "overall_score": run.run_metadata.get("overall_score"),
        "overall_appraisal": run.run_metadata.get("overall_appraisal"),
        "status_counts": run.run_metadata.get("status_counts") or {},
        "review_report": run.run_metadata.get("review_report") or {},
        "section_summaries": [
            {
                "section_number": item.section_number,
                "section_title": item.section_title,
                "score": item.score,
                "findings_count": item.findings_count,
                "missing_count": item.missing_count,
                "needs_improvement_count": item.needs_improvement_count,
            }
            for item in run.section_summaries
        ],
        "findings": [
            {
                "id": str(item.id),
                "requirement": item.checklist_title,
                "requirement_ref": item.checklist_section,
                "subsection_number": item.subsection_number,
                "status": item.status,
                "adequacy": item.adequacy,
                "confidence": item.confidence_score,
                "evidence": item.evidence_summary,
                "assessment": item.ai_analysis,
                "gaps": item.missing_elements,
                "recommendation": item.recommendation,
                "references": item.evidence_references,
                "reviewer_decision": (item.finding_metadata or {}).get("reviewer_decision"),
                "reviewer_decision_note": (item.finding_metadata or {}).get("reviewer_decision_note"),
            }
            for item in run.findings
        ],
        "reviewer_decisions": [
            {
                "status": item.status,
                "decision_note": item.decision_note,
                "decided_at": item.decided_at.isoformat() if item.decided_at else None,
            }
            for item in run.review_approvals
        ],
    }


def _attachments_by_subsection(document: EiaDocument) -> dict[UUID, list[object]]:
    grouped: dict[UUID, list[object]] = {}
    for attachment in document.attachments:
        grouped.setdefault(attachment.subsection_id, []).append(attachment)
    return grouped


def _export_content(subsection: EiaSubSection) -> str:
    if subsection.content_html:
        return _html_to_text(subsection.content_html)
    if subsection.content:
        return _html_to_text(subsection.content)
    return ""


def _html_to_text(value: str) -> str:
    normalized = re.sub(r"<\s*br\s*/?\s*>", "\n", value, flags=re.IGNORECASE)
    normalized = re.sub(r"</p\s*>", "\n\n", normalized, flags=re.IGNORECASE)
    normalized = re.sub(r"<li\s*>", "- ", normalized, flags=re.IGNORECASE)
    normalized = re.sub(r"</li\s*>", "\n", normalized, flags=re.IGNORECASE)
    normalized = re.sub(r"<[^>]+>", "", normalized)
    normalized = unescape(normalized)
    normalized = re.sub(r"\n{3,}", "\n\n", normalized)
    return normalized.strip()


def _split_paragraphs(content: str) -> list[str]:
    paragraphs = [paragraph.strip() for paragraph in re.split(r"\n{2,}", content) if paragraph.strip()]
    return paragraphs or [content.strip()]


def _pdf_safe_text(value: str) -> str:
    return escape(value).replace("\n", "<br/>")
