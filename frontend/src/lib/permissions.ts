import type { User } from "@/lib/types";

export const PERMISSIONS = {
  PROJECT_CREATE: "project:create",
  PROJECT_UPDATE: "project:update",
  PROJECT_DELETE: "project:delete",
  DOCUMENT_UPLOAD: "document:upload",
  DOCUMENT_VERSION_CREATE: "document:version:create",
  DOCUMENT_READ: "document:read",
  REVIEW_READ: "review:read",
  REVIEW_MANAGE: "review:manage",
  USER_READ: "user:read",
  USER_MANAGE: "user:manage",
  TENANT_MANAGE: "tenant:manage"
} as const;

export function hasPermission(user: User | null, permission: string): boolean {
  return Boolean(user?.permissions?.includes(permission));
}

export function hasAnyRole(user: User | null, roles: string[]): boolean {
  const allowed = new Set(roles.map((role) => role.toLowerCase()));
  return Boolean(user?.roles?.some((role) => allowed.has(role.toLowerCase())));
}

const MANAGEMENT_ROLES = ["owner", "admin", "project_manager"];

export function canAccessAuthorPortal(user: User | null): boolean {
  return hasAnyRole(user, [...MANAGEMENT_ROLES, "consultant"]);
}

export function canAccessReviewPortal(user: User | null): boolean {
  return hasAnyRole(user, [...MANAGEMENT_ROLES, "reviewer"]);
}

export function canAccessRegulatorPortal(user: User | null): boolean {
  return hasAnyRole(user, ["owner", "admin", "regulator"]);
}

export function canAccessReadOnlyPortal(user: User | null): boolean {
  return hasAnyRole(user, ["viewer"]);
}

export function portalName(user: User | null): string {
  if (hasAnyRole(user, ["owner", "admin"])) return "Administration portal";
  if (hasAnyRole(user, ["project_manager"])) return "Project management portal";
  if (hasAnyRole(user, ["consultant"])) return "Consultant portal";
  if (hasAnyRole(user, ["reviewer"])) return "Reviewer portal";
  if (hasAnyRole(user, ["regulator"])) return "Regulator portal";
  return "Read-only portal";
}

export function displayRole(user: User | null): string {
  if (!user) {
    return "Guest";
  }
  return user.role || user.roles[0]?.toUpperCase() || "UNASSIGNED";
}

export function canEditEiaDocument(documentRole: string | null | undefined): boolean {
  return documentRole === "EDITOR";
}

export function canReviewEiaDocument(documentRole: string | null | undefined): boolean {
  return documentRole === "EDITOR" || documentRole === "REVIEWER";
}

export function canCommentOnEiaDocument(documentRole: string | null | undefined): boolean {
  return Boolean(documentRole);
}
