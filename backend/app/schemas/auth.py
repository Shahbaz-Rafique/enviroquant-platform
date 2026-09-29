from pydantic import AliasChoices, BaseModel, ConfigDict, EmailStr, Field

from app.schemas.user import UserRead


class RegisterTenantRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    tenant_name: str = Field(
        min_length=2,
        max_length=160,
        validation_alias=AliasChoices("tenant_name", "organization_name"),
    )
    tenant_slug: str | None = Field(
        default=None,
        min_length=2,
        max_length=80,
        validation_alias=AliasChoices("tenant_slug", "organization_slug"),
    )
    full_name: str = Field(min_length=2, max_length=160)
    email: EmailStr
    password: str = Field(min_length=10, max_length=128)


class LoginRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    email: EmailStr
    password: str
    tenant_slug: str | None = Field(
        default=None,
        validation_alias=AliasChoices("tenant_slug", "organization_slug"),
    )


class AcceptInvitationRequest(BaseModel):
    token: str = Field(min_length=24, max_length=256)
    password: str = Field(min_length=10, max_length=128)
    full_name: str | None = Field(default=None, min_length=2, max_length=160)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserRead
