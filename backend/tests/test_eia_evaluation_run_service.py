from datetime import UTC, datetime, timedelta
from types import SimpleNamespace
from unittest import TestCase
from unittest.mock import patch
from uuid import uuid4

from fastapi import HTTPException, status

from app.services import eia_evaluation_service


class FakeScalarResult:
    def __init__(self, values: list[object]) -> None:
        self._values = values

    def all(self) -> list[object]:
        return self._values


class FakeSession:
    def __init__(self, values: list[object] | None = None) -> None:
        self._values = values or []
        self.commit_count = 0

    def scalars(self, _statement: object) -> FakeScalarResult:
        return FakeScalarResult(self._values)

    def commit(self) -> None:
        self.commit_count += 1


def make_document(*, with_subsections: bool) -> SimpleNamespace:
    subsection = SimpleNamespace(id=uuid4()) if with_subsections else None
    sections = [SimpleNamespace(subsections=[subsection])] if subsection else [SimpleNamespace(subsections=[])]
    return SimpleNamespace(id=uuid4(), project_id=uuid4(), sections=sections)


class EvaluationRunGuardrailTests(TestCase):
    def test_enqueue_rejects_documents_without_subsections(self) -> None:
        document = make_document(with_subsections=False)
        current_user = SimpleNamespace(id=uuid4(), tenant_id=uuid4())
        payload = SimpleNamespace(source_document_id=None, source_version_id=None, prompt_version=None)

        with (
            patch.object(eia_evaluation_service, "_get_document_for_evaluation", return_value=document),
            patch.object(eia_evaluation_service, "_reconcile_stale_runs"),
        ):
            with self.assertRaises(HTTPException) as exc_info:
                eia_evaluation_service.enqueue_eia_evaluation_run(FakeSession(), current_user, uuid4(), payload)

        self.assertEqual(exc_info.exception.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(exc_info.exception.detail, eia_evaluation_service.NO_SUBSECTIONS_DETAIL)

    def test_enqueue_rejects_when_active_run_exists(self) -> None:
        document = make_document(with_subsections=True)
        current_user = SimpleNamespace(id=uuid4(), tenant_id=uuid4())
        payload = SimpleNamespace(source_document_id=None, source_version_id=None, prompt_version=None)

        with (
            patch.object(eia_evaluation_service, "_get_document_for_evaluation", return_value=document),
            patch.object(eia_evaluation_service, "_reconcile_stale_runs"),
            patch.object(eia_evaluation_service, "_get_active_evaluation_run", return_value=SimpleNamespace(id=uuid4())),
        ):
            with self.assertRaises(HTTPException) as exc_info:
                eia_evaluation_service.enqueue_eia_evaluation_run(FakeSession(), current_user, uuid4(), payload)

        self.assertEqual(exc_info.exception.status_code, status.HTTP_409_CONFLICT)
        self.assertEqual(exc_info.exception.detail, eia_evaluation_service.ACTIVE_RUN_DETAIL)

    def test_reconcile_stale_runs_marks_old_running_runs_failed(self) -> None:
        stale_time = datetime.now(UTC) - eia_evaluation_service.EVALUATION_STALE_AFTER - timedelta(minutes=1)
        run = SimpleNamespace(
            status="RUNNING",
            updated_at=stale_time,
            started_at=stale_time,
            created_at=stale_time,
            completed_at=None,
            run_metadata={"warnings": []},
        )
        db = FakeSession([run])

        eia_evaluation_service._reconcile_stale_runs(db, uuid4(), uuid4())

        self.assertEqual(run.status, "FAILED")
        self.assertEqual(run.run_metadata["failure_code"], "stale_run")
        self.assertEqual(run.run_metadata["status_message"], eia_evaluation_service.STALE_RUN_DETAIL)
        self.assertEqual(db.commit_count, 1)
