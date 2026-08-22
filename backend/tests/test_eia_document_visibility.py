from types import SimpleNamespace
from unittest.mock import patch
from uuid import uuid4

from sqlalchemy.dialects import postgresql

from app.services.eia_service import list_project_eia_documents


class CapturingSession:
    def __init__(self) -> None:
        self.statement = None

    def scalars(self, statement):
        self.statement = statement
        return SimpleNamespace(all=lambda: [])


def test_project_eia_list_is_always_scoped_to_creator_or_member() -> None:
    session = CapturingSession()
    user = SimpleNamespace(
        id=uuid4(),
        tenant_id=uuid4(),
        role_names=["owner", "admin", "project_manager"],
    )
    project = SimpleNamespace(id=uuid4())

    with patch("app.services.eia_service.get_project_for_tenant", return_value=project):
        result = list_project_eia_documents(session, user, project.id)

    assert result == []
    assert session.statement is not None
    compiled = str(
        session.statement.compile(
            dialect=postgresql.dialect(),
            compile_kwargs={"literal_binds": True},
        )
    )

    assert f"eia_documents.created_by_id = '{user.id}'" in compiled
    assert "eia_document_members.id IS NOT NULL" in compiled
    assert f"eia_document_members.user_id = '{user.id}'" in compiled
    assert f"eia_document_members.tenant_id = '{user.tenant_id}'" in compiled


def test_project_eia_list_remains_scoped_to_requested_project_and_tenant() -> None:
    session = CapturingSession()
    user = SimpleNamespace(id=uuid4(), tenant_id=uuid4(), role_names=[])
    project = SimpleNamespace(id=uuid4())

    with patch("app.services.eia_service.get_project_for_tenant", return_value=project):
        list_project_eia_documents(session, user, project.id)

    assert session.statement is not None
    compiled = str(
        session.statement.compile(
            dialect=postgresql.dialect(),
            compile_kwargs={"literal_binds": True},
        )
    )
    assert f"eia_documents.project_id = '{project.id}'" in compiled
    assert f"eia_documents.tenant_id = '{user.tenant_id}'" in compiled
