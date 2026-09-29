from datetime import UTC, datetime
from types import SimpleNamespace
from unittest.mock import Mock, patch
from uuid import uuid4

import pytest

from app.services.eia_assignment_service import _notify_assignees
from app.services.email_service import send_assignment_notification
from app.services.user_service import hash_invitation_token, renew_pending_invitation


@pytest.mark.parametrize('status', ['pending_invite', 'invite_expired', 'active', 'disabled'])
def test_assignment_email_requires_activation_for_invitees(status):
    db = Mock()
    actor = SimpleNamespace(id=uuid4(), full_name='Admin')
    reviewer = SimpleNamespace(id=uuid4(), email='reviewer@example.test', full_name='Reviewer', status=status)
    document = SimpleNamespace(
        id=uuid4(), project_id=uuid4(), title='EIA', created_by_id=actor.id, created_by=actor,
        members=[SimpleNamespace(user_id=reviewer.id, user=reviewer)],
    )
    section = SimpleNamespace(section_number=1, title='Introduction')
    payload = SimpleNamespace(author_user_id=None, reviewer_user_id=reviewer.id)
    with patch('app.services.eia_assignment_service.renew_pending_invitation', return_value='https://example.test/accept-invite?token=secret') as renew, patch('app.services.eia_assignment_service.send_assignment_notification') as send:
        _notify_assignees(db, document, section, payload, actor)
    if status == 'disabled':
        send.assert_not_called()
        renew.assert_not_called()
    elif status == 'active':
        renew.assert_not_called()
        assert send.call_args.kwargs['activation_required'] is False
        assert send.call_args.kwargs['project_url'].endswith(f'/projects/{document.project_id}/eia/{document.id}')
    else:
        renew.assert_called_once_with(db, reviewer)
        assert send.call_args.kwargs['activation_required'] is True
        assert '/accept-invite?token=' in send.call_args.kwargs['project_url']


def test_renewal_preserves_roles_and_stores_only_token_hash():
    db = Mock()
    roles = ['reviewer']
    user = SimpleNamespace(status='pending_invite', roles=roles, tenant_id=uuid4())
    with patch('app.services.user_service.secrets.token_urlsafe', return_value='new-secret'):
        link = renew_pending_invitation(db, user)
    assert link.endswith('/accept-invite?token=new-secret')
    assert user.invitation_token_hash == hash_invitation_token('new-secret')
    assert user.invitation_expires_at > datetime.now(UTC)
    assert user.roles is roles
    db.commit.assert_called_once()


def test_pending_assignment_email_labels_password_setup_in_both_formats():
    url = 'https://example.test/accept-invite?token=secret'
    with patch('app.services.email_service._send_async') as send:
        send_assignment_notification('reviewer@example.test', 'Reviewer', 'Admin', 'EIA', 'Section 1', 'reviewer', url, activation_required=True)
    text_body, html_body = send.call_args.args[2:]
    for body in [text_body, html_body]:
        assert 'Accept Invitation & Set Password' in body
        assert url in body
        assert 'Open EIA Workspace' not in body
