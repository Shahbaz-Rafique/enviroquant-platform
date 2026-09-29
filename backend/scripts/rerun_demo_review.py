"""Run the review synchronously and refresh demo exports for one EIA."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.db.session import SessionLocal
from app.models.eia import EiaDocument
from app.models.eia_evaluation import EiaEvaluationRun
from app.schemas.eia import EiaEvaluationRunCreate
from app.services.eia_document_export_service import build_compiled_eia_docx_bytes, build_compiled_eia_pdf_bytes
from app.services.eia_evaluation_report_service import build_report_docx_bytes, build_report_pdf_bytes
from app.services.eia_evaluation_service import enqueue_eia_evaluation_run, process_eia_evaluation_run_background


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--document-id", type=UUID, required=True)
    parser.add_argument("--output-dir", type=Path, default=Path("demo_outputs"))
    args = parser.parse_args()
    args.output_dir.mkdir(parents=True, exist_ok=True)

    with SessionLocal() as db:
        document = db.scalar(
            select(EiaDocument).options(selectinload(EiaDocument.created_by)).where(EiaDocument.id == args.document_id)
        )
        if document is None:
            raise SystemExit("EIA document not found")
        user = document.created_by
        run = enqueue_eia_evaluation_run(db, user, document.id, EiaEvaluationRunCreate())
        run_id = run.id

    process_eia_evaluation_run_background(run_id)

    with SessionLocal() as db:
        document = db.scalar(
            select(EiaDocument).options(selectinload(EiaDocument.created_by)).where(EiaDocument.id == args.document_id)
        )
        run = db.get(EiaEvaluationRun, run_id)
        if run is None or run.status != "COMPLETED":
            raise SystemExit(f"Review did not complete: {getattr(run, 'status', 'missing')}")
        user = document.created_by
        outputs = {
            "Kuwait-E2E-Quality-Review.pdf": build_report_pdf_bytes(db, user, document.id, run.id),
            "Kuwait-E2E-Quality-Review.docx": build_report_docx_bytes(db, user, document.id, run.id),
            "Kuwait-E2E-Final-EIA.pdf": build_compiled_eia_pdf_bytes(db, user, document.id, refresh_summary=False),
            "Kuwait-E2E-Final-EIA.docx": build_compiled_eia_docx_bytes(db, user, document.id, refresh_summary=False),
        }
        for name, content in outputs.items():
            (args.output_dir / name).write_bytes(content)
        print(json.dumps({
            "run_id": str(run.id), "status": run.status,
            "overall_score": (run.run_metadata or {}).get("overall_score"),
            "status_counts": (run.run_metadata or {}).get("status_counts"),
            "routed_chunk_count": (run.run_metadata or {}).get("routed_chunk_count"),
            "outputs": [str((args.output_dir / name).resolve()) for name in outputs],
        }))


if __name__ == "__main__":
    main()
