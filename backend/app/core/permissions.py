class Roles:
    ADMIN = "admin"
    PROJECT_MANAGER = "project_manager"
    CONSULTANT = "consultant"
    REVIEWER = "reviewer"
    OWNER = "owner"
    REGULATOR = "regulator"
    VIEWER = "viewer"


class Permissions:
    TENANT_READ = "tenant:read"
    TENANT_MANAGE = "tenant:manage"
    USER_READ = "user:read"
    USER_MANAGE = "user:manage"
    PROJECT_CREATE = "project:create"
    PROJECT_READ = "project:read"
    PROJECT_UPDATE = "project:update"
    PROJECT_DELETE = "project:delete"
    DOCUMENT_UPLOAD = "document:upload"
    DOCUMENT_READ = "document:read"
    DOCUMENT_VERSION_CREATE = "document:version:create"
    DOCUMENT_DELETE = "document:delete"
    REVIEW_READ = "review:read"
    REVIEW_MANAGE = "review:manage"


ALL_PERMISSIONS = [
    Permissions.TENANT_READ,
    Permissions.TENANT_MANAGE,
    Permissions.USER_READ,
    Permissions.USER_MANAGE,
    Permissions.PROJECT_CREATE,
    Permissions.PROJECT_READ,
    Permissions.PROJECT_UPDATE,
    Permissions.PROJECT_DELETE,
    Permissions.DOCUMENT_UPLOAD,
    Permissions.DOCUMENT_READ,
    Permissions.DOCUMENT_VERSION_CREATE,
    Permissions.DOCUMENT_DELETE,
    Permissions.REVIEW_READ,
    Permissions.REVIEW_MANAGE,
]


DEFAULT_ROLE_PERMISSIONS = {
    Roles.ADMIN: [
        *ALL_PERMISSIONS,
    ],
    Roles.PROJECT_MANAGER: [
        Permissions.TENANT_READ,
        Permissions.USER_READ,
        Permissions.PROJECT_CREATE,
        Permissions.PROJECT_READ,
        Permissions.PROJECT_UPDATE,
        Permissions.PROJECT_DELETE,
        Permissions.DOCUMENT_UPLOAD,
        Permissions.DOCUMENT_READ,
        Permissions.DOCUMENT_VERSION_CREATE,
        Permissions.REVIEW_READ,
        Permissions.REVIEW_MANAGE,
    ],
    Roles.CONSULTANT: [
        Permissions.TENANT_READ,
        Permissions.PROJECT_CREATE,
        Permissions.PROJECT_READ,
        Permissions.PROJECT_UPDATE,
        Permissions.DOCUMENT_UPLOAD,
        Permissions.DOCUMENT_READ,
        Permissions.DOCUMENT_VERSION_CREATE,
        Permissions.REVIEW_READ,
    ],
    Roles.REVIEWER: [
        Permissions.TENANT_READ,
        Permissions.PROJECT_READ,
        Permissions.DOCUMENT_READ,
        Permissions.REVIEW_READ,
        Permissions.REVIEW_MANAGE,
    ],
    # Legacy compatibility for pre-MVP role names already present in existing tenants.
    Roles.OWNER: [
        *ALL_PERMISSIONS,
    ],
    Roles.REGULATOR: [
        Permissions.TENANT_READ,
        Permissions.PROJECT_READ,
        Permissions.DOCUMENT_READ,
        Permissions.REVIEW_READ,
        Permissions.REVIEW_MANAGE,
    ],
    Roles.VIEWER: [
        Permissions.TENANT_READ,
        Permissions.PROJECT_READ,
        Permissions.DOCUMENT_READ,
    ],
}


PROJECT_MANAGE_ROLES = [Roles.OWNER, Roles.ADMIN, Roles.PROJECT_MANAGER, Roles.CONSULTANT]
DOCUMENT_UPLOAD_ROLES = [Roles.OWNER, Roles.ADMIN, Roles.PROJECT_MANAGER, Roles.CONSULTANT]
AUTHOR_PORTAL_ROLES = [Roles.OWNER, Roles.ADMIN, Roles.PROJECT_MANAGER, Roles.CONSULTANT]
REVIEW_PORTAL_ROLES = [Roles.OWNER, Roles.ADMIN, Roles.PROJECT_MANAGER, Roles.REVIEWER]
REGULATOR_PORTAL_ROLES = [Roles.OWNER, Roles.ADMIN, Roles.REGULATOR]
READ_ONLY_ROLES = [
    Roles.OWNER,
    Roles.ADMIN,
    Roles.PROJECT_MANAGER,
    Roles.CONSULTANT,
    Roles.REVIEWER,
    Roles.REGULATOR,
    Roles.VIEWER,
]
TENANT_ADMIN_ROLES = [Roles.OWNER, Roles.ADMIN]
