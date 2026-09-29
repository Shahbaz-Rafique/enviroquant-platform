from datetime import UTC, datetime
from types import SimpleNamespace
from unittest.mock import Mock, patch
from uuid import uuid4

import pytest
from fastapi import HTTPException

from app.schemas.eia import EiaWorkflowTransitionRequest
from app.services.eia_assignment_service import _build_subsection_assignment_item
from app.services.eia_review_workflow_service import (
    _effective_assignment, _notify_workflow_transition, _workflow_capabilities,
    transition_subsection_workflow,
)


def setup_assignment(reviewer_override=None, section_reviewer=True):
    author = SimpleNamespace(id=uuid4(), full_name='Author', email='author@example.test', role_names=['consultant'], status='active')
    reviewer = SimpleNamespace(id=uuid4(), full_name='Reviewer', email='reviewer@example.test', role_names=['reviewer'], status='active')
    section_id = uuid4()
    subsection = SimpleNamespace(
        id=uuid4(), section_id=section_id, subsection_number='1.1', title='Scope',
        completion_status='IN_PROGRESS', progress_percentage=50, last_edited_at=None,
        updated_at=datetime.now(UTC), last_edited_by_id=None, last_edited_by=None,
    )
    document = SimpleNamespace(
        id=uuid4(), project_id=uuid4(), title='EIA', created_by_id=author.id, created_by=author,
        members=[SimpleNamespace(user_id=author.id, user=author, role='EDITOR'), SimpleNamespace(user_id=reviewer.id, user=reviewer, role='REVIEWER')],
        document_metadata={'assignments': {
            'sections': {str(section_id): {'reviewer_user_id': str(reviewer.id) if section_reviewer else None}},
            'subsections': {str(subsection.id): {'author_user_id': str(author.id), 'reviewer_user_id': str(reviewer_override) if reviewer_override else None}},
        }},
    )
    subsection.document = document
    subsection.eia_document_id = document.id
    author.tenant_id = uuid4()
    return document, subsection, author, reviewer


def test_submission_inherits_section_reviewer_with_author_override():
    document, subsection, author, reviewer = setup_assignment()
    db = Mock()
    with patch('app.services.eia_review_workflow_service._load_subsection', return_value=subsection), patch('app.services.eia_review_workflow_service.record_audit_event'), patch('app.services.eia_review_workflow_service._notify_workflow_transition'):
        result = transition_subsection_workflow(db, author, subsection.id, EiaWorkflowTransitionRequest(target_status='READY_FOR_REVIEW'))
    assert result.completion_status == 'READY_FOR_REVIEW'
    assert _workflow_capabilities(document, subsection, reviewer) == (False, True)
    db.commit.assert_called_once()


def test_explicit_subsection_reviewer_takes_precedence():
    override = uuid4()
    document, subsection, _, reviewer = setup_assignment(override)
    assert _effective_assignment(document, subsection)['reviewer_user_id'] == override
    assert _workflow_capabilities(document, subsection, reviewer)[1] is False


def test_submission_still_requires_an_assigned_reviewer():
    _, subsection, author, _ = setup_assignment(section_reviewer=False)
    db = Mock()
    with patch('app.services.eia_review_workflow_service._load_subsection', return_value=subsection), pytest.raises(HTTPException) as error:
        transition_subsection_workflow(db, author, subsection.id, EiaWorkflowTransitionRequest(target_status='READY_FOR_REVIEW'))
    assert error.value.status_code == 409
    db.commit.assert_not_called()


def test_overview_shows_inherited_reviewer():
    _, subsection, author, reviewer = setup_assignment()
    item, role = _build_subsection_assignment_item(subsection, {'reviewer_user_id': reviewer.id}, {'author_user_id': author.id, 'reviewer_user_id': None}, {}, {author.id: author, reviewer.id: reviewer}, reviewer.id)
    assert item['reviewer_assignee']['id'] == reviewer.id
    assert role == 'REVIEWER'


def test_submission_notification_reaches_inherited_reviewer():
    document, subsection, author, reviewer = setup_assignment()
    with patch('app.services.eia_review_workflow_service.send_workflow_transition_notification') as send:
        _notify_workflow_transition(document, subsection, author, 'IN_PROGRESS', 'READY_FOR_REVIEW', None)
    assert send.call_args.kwargs['recipient_email'] == reviewer.email
