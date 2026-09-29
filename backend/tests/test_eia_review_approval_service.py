from datetime import UTC, datetime
from types import SimpleNamespace
from unittest import TestCase
from unittest.mock import patch
from uuid import uuid4

from fastapi import HTTPException, status

from app.services import eia_regulator_service, eia_review_approval_service


class FakeScalarResult:
    def __init__(self, values: list[object]) -> None:
        self._values = values

    def unique(self) -> "FakeScalarResult":
        return self

    def all(self) -> list[object]:
        return self._values


class FakeSession:
    def __init__(self, values: list[object] | None = None) -> None:
        self._values = values or []

    def scalars(self, _statement: object) -> FakeScalarResult:
        return FakeScalarResult(self._values)


class ReviewApprovalFallbackTests(TestCase):
    def test_list_review_approvals_returns_empty_when_table_is_unavailable(self) -> None:
        document = SimpleNamespace(id=uuid4())
        current_user = SimpleNamespace(tenant_id=uuid4())

        with (
            patch.object(
                eia_review_approval_service,
                "get_eia_document_for_tenant",
                return_value=document,
            ),
            patch.object(eia_review_approval_service, "review_approval_table_exists", return_value=False),
        ):
            approvals = eia_review_approval_service.list_review_approvals(FakeSession(), current_user, uuid4())

        self.assertEqual(approvals, [])

    def test_create_review_approval_request_raises_clear_error_when_table_is_unavailable(self) -> None:
        document = SimpleNamespace(id=uuid4(), project_id=uuid4())
        current_user = SimpleNamespace(id=uuid4(), tenant_id=uuid4())
        payload = SimpleNamespace(evaluation_run_id=uuid4(), request_note=None)

        with (
            patch.object(
                eia_review_approval_service,
                "get_eia_document_for_tenant",
                return_value=document,
            ),
            patch.object(eia_review_approval_service, "review_approval_table_exists", return_value=False),
        ):
            with self.assertRaises(HTTPException) as exc_info:
                eia_review_approval_service.create_review_approval_request(
                    FakeSession(),
                    current_user,
                    uuid4(),
                    payload,
                )

        self.assertEqual(exc_info.exception.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)
        self.assertIn(eia_review_approval_service.REVIEW_APPROVALS_MIGRATION, exc_info.exception.detail)

    def test_regulator_overview_skips_approvals_when_table_is_unavailable(self) -> None:
        project = SimpleNamespace(id=uuid4())
        current_user = SimpleNamespace(tenant_id=uuid4())
        run = SimpleNamespace(
            id=uuid4(),
            status="COMPLETED",
            created_at=datetime.now(UTC),
            completed_at=datetime.now(UTC),
            run_metadata={"overall_score": 8.2, "overall_appraisal": "Robust"},
            section_summaries=[],
        )
        document = SimpleNamespace(
            id=uuid4(),
            title="Air Quality Statement",
            status="IN_REVIEW",
            evaluation_runs=[run],
        )

        with (
            patch.object(eia_regulator_service, "_get_project_for_insights", return_value=project),
            patch.object(eia_regulator_service, "review_approval_table_exists", return_value=False),
        ):
            overview = eia_regulator_service.get_regulator_overview(FakeSession([document]), current_user, uuid4())

        self.assertEqual(overview["project_id"], project.id)
        self.assertEqual(overview["recent_decisions"], [])
        self.assertIsNone(overview["benchmark_documents"][0]["approval_status"])
