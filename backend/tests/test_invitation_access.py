from datetime import UTC, datetime, timedelta
from types import SimpleNamespace
from unittest.mock import Mock, patch
from uuid import uuid4

import pytest
from fastapi import HTTPException

from app.schemas.auth import AcceptInvitationRequest
from app.services.eia_collaboration_service import (
    invite_eia_document_member,
    remove_eia_document_member,
)
from app.services.user_service import accept_invitation, build_invitation_url


@pytest.mark.parametrize('role', ['consultant', 'reviewer', 'project_manager', 'viewer'])
@pytest.mark.parametrize('action', [invite_eia_document_member, remove_eia_document_member])
def test_non_admin_cannot_manage_document_members(role, action):
    db = Mock()
    user = SimpleNamespace(role_names=[role], id=uuid4(), tenant_id=uuid4())
    with pytest.raises(HTTPException) as error:
        action(db, user, uuid4(), Mock())
    assert error.value.status_code == 403
    db.get.assert_not_called()
    db.scalar.assert_not_called()
    db.commit.assert_not_called()


@pytest.mark.parametrize('role', ['admin', 'owner'])
def test_admin_invitation_still_checks_document_scope(role):
    user = SimpleNamespace(role_names=[role], id=uuid4(), tenant_id=uuid4())
    with patch('app.services.eia_collaboration_service.get_eia_document_for_tenant') as get_document:
        get_document.side_effect = HTTPException(status_code=404)
        with pytest.raises(HTTPException) as error:
            invite_eia_document_member(Mock(), user, uuid4(), Mock())
    assert error.value.status_code == 404
    get_document.assert_called_once()


def test_invitation_link_uses_activation_page():
    with patch('app.services.user_service.settings', frontend_app_url='https://example.test/'):
        assert build_invitation_url('test-token') == 'https://example.test/accept-invite?token=test-token'


def test_accept_invitation_preserves_existing_reviewer_and_organization():
    tenant = SimpleNamespace(id=uuid4())
    roles = [SimpleNamespace(name='reviewer')]
    user = SimpleNamespace(
        status='pending_invite', invitation_expires_at=datetime.now(UTC) + timedelta(days=1),
        tenant=tenant, roles=roles, full_name='Invited Reviewer',
    )
    db = Mock()
    db.scalar.return_value = user
    with patch('app.services.user_service.sync_tenant_roles'), patch(
        'app.services.user_service.hash_password', return_value='hashed-password'
    ):
        result = accept_invitation(db, AcceptInvitationRequest(token='test-token-with-at-least-24-characters', password='secure-password'))
    assert result is user
    assert result.tenant is tenant
    assert result.roles is roles
    assert result.status == 'active'
    assert result.invitation_token_hash is None
    assert result.invitation_expires_at is None
    assert result.hashed_password == 'hashed-password'
    db.add.assert_not_called()
    db.commit.assert_called_once()
