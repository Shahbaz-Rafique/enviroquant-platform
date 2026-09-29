"""Add question-specific, clearly labelled demonstration evidence to one EIA.

This script is only for product-review fixtures. It does not turn illustrative data
into verified project evidence and deliberately leaves a controlled set of gaps.
"""

from __future__ import annotations

import argparse
import hashlib
import json
from datetime import UTC, datetime
from pathlib import Path
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.db.session import SessionLocal
from app.models.document import Document, DocumentVersion
from app.models.document_chunk import DocumentChunk
from app.models.eia import EiaDocument, EiaSection
from app.seeds.eia_checklist_seed import RQEIA_REVIEW_STRUCTURE


AREA_TO_BUILDER = {
    "1": ("2", "9", "10"),
    "2": ("4",),
    "3": ("5",),
    "4": ("6", "9", "10", "11"),
    "5": ("7", "8"),
    "6": ("1",),
    "7": ("3", "12"),
    "8": ("1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "13", "14", "A"),
}


def _coverage(index: int) -> str:
    # Stable, realistic demonstration mix: 68% addressed, 22% partial, 10% open.
    position = index % 100
    if position < 68:
        return "ADDRESSED"
    if position < 90:
        return "PARTIAL"
    return "OPEN"


def _answer(number: str, title: str, state: str, evidence_id: str) -> str:
    if state == "ADDRESSED":
        return (
            f"{number} — {title}\n"
            f"Demonstration assessment: Addressed for the product-review scenario. The project team recorded the "
            "relevant scope, method, receptors, assumptions and management response in the controlled design and "
            "assessment register. Quantities and spatial boundaries are stated in the referenced record, impacts are "
            "considered for construction, operation and closure where applicable, and the reviewer must validate the "
            "record before issue. Evidence: " + evidence_id + ". Status: demonstration evidence available."
        )
    if state == "PARTIAL":
        return (
            f"{number} — {title}\n"
            f"Demonstration assessment: Partially addressed. Existing project material establishes the assessment "
            "approach and preliminary conclusion, but a final quantified value, authority confirmation or specialist "
            "sign-off remains outstanding. Available evidence: " + evidence_id + ". Required action: confirm the open "
            "item and record the authorised reviewer's decision before controlled issue."
        )
    return (
        f"{number} — {title}\n"
        "Demonstration assessment: Open finding. No verified project evidence is available for this requirement. "
        "Do not infer compliance or create substitute environmental data. Required action: obtain the relevant survey, "
        "study, modelling result, authority response or specialist input, then re-run the review."
    )


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--document-id", type=UUID, required=True)
    parser.add_argument("--output-dir", type=Path, default=Path("demo_outputs"))
    parser.add_argument("--confirm", action="store_true")
    args = parser.parse_args()
    if not args.confirm:
        raise SystemExit("Pass --confirm to create clearly labelled demonstration evidence.")

    args.output_dir.mkdir(parents=True, exist_ok=True)
    with SessionLocal() as db:
        eia = db.scalar(
            select(EiaDocument)
            .options(selectinload(EiaDocument.sections).selectinload(EiaSection.subsections))
            .where(EiaDocument.id == args.document_id)
        )
        if eia is None:
            raise SystemExit("EIA document not found")

        sections = {section.section_number: section for section in eia.sections}
        additions: dict[UUID, list[str]] = {}
        evidence_rows: list[tuple[str, str, str, str]] = []
        global_index = 0
        for area_number, area in RQEIA_REVIEW_STRUCTURE.items():
            targets = [sub for number in AREA_TO_BUILDER[area_number] if number in sections for sub in sections[number].subsections]
            if not targets:
                continue
            for local_index, question in enumerate(area["subsections"]):
                state = _coverage(global_index)
                evidence_id = f"DEMO-RQEIA-{question['number']}"
                answer = _answer(str(question["number"]), str(question["title"]), state, evidence_id)
                additions.setdefault(targets[local_index % len(targets)].id, []).append(answer)
                evidence_rows.append((str(question["number"]), str(question["title"]), state, answer))
                global_index += 1

        now = datetime.now(UTC)
        for section in eia.sections:
            for subsection in section.subsections:
                blocks = additions.get(subsection.id, [])
                if not blocks:
                    continue
                base = subsection.content_html or subsection.content or ""
                details = "".join(
                    "<div><h4>" + row.split("\n", 1)[0] + "</h4><p>" + row.split("\n", 1)[1] + "</p></div>"
                    for row in blocks
                )
                html = base + "<h3>RQEIA demonstration evidence register</h3>" + details
                subsection.content = html
                subsection.content_html = html
                subsection.last_edited_at = now

        filename = "EnviroQuant-Kuwait-RQEIA-Demonstration-Evidence-Register.txt"
        evidence_text = (
            "CONTROLLED DEMONSTRATION DATA — NOT VERIFIED PROJECT EVIDENCE\n"
            "This register exists solely for EnviroQuant product workflow assessment.\n\n"
            + "\n\n".join(row[3] for row in evidence_rows)
        )
        file_path = (args.output_dir / filename).resolve()
        file_path.write_text(evidence_text)
        checksum = hashlib.sha256(evidence_text.encode()).hexdigest()

        source = db.scalar(select(Document).where(Document.project_id == eia.project_id, Document.original_filename == filename))
        if source is None:
            source = Document(
                tenant_id=eia.tenant_id, project_id=eia.project_id, uploaded_by_id=eia.created_by_id,
                original_filename=filename, document_type="demonstration_evidence", status="processed",
                document_metadata={"demonstration": True, "warning": "Not verified project evidence"},
            )
            db.add(source)
            db.flush()
            version = DocumentVersion(
                tenant_id=eia.tenant_id, document_id=source.id, uploaded_by_id=eia.created_by_id,
                version_number=1, storage_path=str(file_path), mime_type="text/plain",
                size_bytes=len(evidence_text.encode()), checksum_sha256=checksum, parser_status="completed",
                version_metadata={"demonstration": True}, uploaded_at=now,
            )
            db.add(version)
            db.flush()
            source.current_version_id = version.id
        else:
            version = source.current_version
            db.query(DocumentChunk).filter(DocumentChunk.document_id == source.id).delete()
            version.storage_path = str(file_path)
            version.size_bytes = len(evidence_text.encode())
            version.checksum_sha256 = checksum

        for index, (number, title, state, answer) in enumerate(evidence_rows):
            if state == "OPEN":
                continue
            db.add(DocumentChunk(
                tenant_id=eia.tenant_id, project_id=eia.project_id, document_id=source.id,
                document_version_id=version.id, chunk_index=index, chunk_key=f"demo-rqeia-{number}",
                page_number=index + 1, section_number=number, section_title=title,
                heading_path=["RQEIA", number], content=answer,
                content_metadata={"demonstration": True, "coverage": state},
            ))

        eia.document_metadata = {
            **(eia.document_metadata or {}),
            "demonstration_evidence_notice": "Illustrative records only; authorised reviewer verification required.",
            "demonstration_evidence_updated_at": now.isoformat(),
        }
        db.commit()
        print(json.dumps({
            "document_id": str(eia.id), "requirements": len(evidence_rows),
            "addressed": sum(row[2] == "ADDRESSED" for row in evidence_rows),
            "partial": sum(row[2] == "PARTIAL" for row in evidence_rows),
            "open": sum(row[2] == "OPEN" for row in evidence_rows),
            "evidence_file": str(file_path),
        }))


if __name__ == "__main__":
    main()
