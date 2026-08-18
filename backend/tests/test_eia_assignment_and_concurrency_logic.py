from datetime import UTC, datetime, timedelta
from uuid import uuid4

import pytest
from fastapi import HTTPException

from app.models.eia import EiaSubSection
from app.services.eia_assignment_service import (
    _section_completion_status,
    _subsection_review_status,
    _user_assignment_role,
)
from app.services.eia_service import assert_subsection_version


def test_user_assignment_role_is_specific_to_current_user() -> None:
    author_id = uuid4()
    reviewer_id = uuid4()

    assert _user_assignment_role(author_id, author_id, reviewer_id) == "AUTHOR"
    assert _user_assignment_role(reviewer_id, author_id, reviewer_id) == "REVIEWER"
    assert _user_assignment_role(uuid4(), author_id, reviewer_id) is None
    assert _user_assignment_role(author_id, author_id, author_id) == "AUTHOR_AND_REVIEWER"


def test_review_and_section_statuses_include_comments_and_progress() -> None:
    assert _subsection_review_status("READY_FOR_REVIEW", 100, 0) == "READY_FOR_REVIEW"
    assert _subsection_review_status("READY_FOR_REVIEW", 100, 2) == "COMMENTS_OPEN"
    assert (
        _section_completion_status(
            [
                {"completion_status": "NOT_STARTED", "progress_percentage": 0},
                {"completion_status": "IN_PROGRESS", "progress_percentage": 35},
            ]
        )
        == "IN_PROGRESS"
    )


def test_subsection_version_accepts_equivalent_utc_timestamp() -> None:
    updated_at = datetime(2026, 8, 18, 10, 30, tzinfo=UTC)
    subsection = EiaSubSection(updated_at=updated_at)

    assert_subsection_version(subsection, updated_at.replace(tzinfo=None))


def test_subsection_version_rejects_stale_timestamp() -> None:
    updated_at = datetime(2026, 8, 18, 10, 30, tzinfo=UTC)
    subsection = EiaSubSection(updated_at=updated_at)

    with pytest.raises(HTTPException) as exc_info:
        assert_subsection_version(subsection, updated_at - timedelta(seconds=1))

    assert exc_info.value.status_code == 409

