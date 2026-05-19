from fastapi import APIRouter, Depends

from app.api.v1.endpoints import auth, documents, organizations, projects, tenants, users
from app.core.dependencies import get_current_user
from app.models.user import User
from app.schemas.user import UserRead


api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(organizations.router, prefix="/organizations", tags=["organizations"])
api_router.include_router(tenants.router, prefix="/tenants", tags=["tenants"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(projects.router, prefix="/projects", tags=["projects"])
api_router.include_router(documents.router, prefix="/documents", tags=["documents"])


@api_router.get("/me", response_model=UserRead, tags=["auth"])
def read_current_user_alias(current_user: User = Depends(get_current_user)) -> User:
    return current_user
