from pydantic import BaseModel, EmailStr, Field

from app.schemas.user import UserRead


class RegisterTenantRequest(BaseModel):
    tenant_name: str = Field(min_length=2, max_length=160)
    tenant_slug: str | None = Field(default=None, min_length=2, max_length=80)
    full_name: str = Field(min_length=2, max_length=160)
    email: EmailStr
    password: str = Field(min_length=10, max_length=128)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str
    tenant_slug: str | None = None


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserRead
