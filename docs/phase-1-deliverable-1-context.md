# Phase 1 Deliverable 1 Context

## Scope

Deliverable 1 establishes the workspace foundation for EnviroQuant:

- Multi-tenant organization registration
- Authentication with JWT access tokens
- Role-based access control
- Tenant-scoped user creation for ADMIN users
- Project creation and metadata storage
- Document upload support for PDF and Word
- Immutable document version records
- Dashboard, project creation UI, and project workspace

This does not include parsing, chunking, evaluation, findings, evidence viewing, scoring, or AI workflows. Those begin in later deliverables.

## Stack

- Backend: FastAPI modular monolith
- Database: PostgreSQL
- ORM and migrations: SQLAlchemy 2 and Alembic
- Frontend: Next.js app router
- File storage: Cloudinary-backed document uploads with secure URLs stored in the database for the MVP foundation

## Backend Modules

- `app/core`: settings, permissions, roles, security, auth dependencies
- `app/db`: database session lifecycle
- `app/models`: tenant, user, RBAC, project, document version, audit tables
- `app/schemas`: request and response contracts
- `app/services`: auth, RBAC bootstrap, organization, user, project, and document workflows
- `app/utils/storage.py`: Cloudinary upload adapter using organization/project/document/version folders
- `app/api/v1/endpoints`: route modules
- `migrations/versions/0001_workspace_foundation.py`: initial schema
- `migrations/versions/0002_rbac_role_alignment.py`: ADMIN/CONSULTANT/REVIEWER/REGULATOR role alignment

## Database Tables

- `tenants`: tenant organization boundary
- `users`: tenant-scoped users
- `roles`: tenant-scoped roles
- `permissions`: global permission keys
- `user_roles`: user to role assignments
- `role_permissions`: role to permission assignments
- `projects`: tenant-scoped project metadata
- `project_members`: project membership foundation
- `documents`: tenant/project document records
- `document_versions`: immutable uploaded file versions with Cloudinary URL and metadata references
- `audit_events`: future-ready audit log foundation

## Initial Permissions

- `tenant:read`
- `tenant:manage`
- `user:read`
- `user:manage`
- `project:create`
- `project:read`
- `project:update`
- `project:delete`
- `document:upload`
- `document:read`
- `document:version:create`
- `document:delete`

Default tenant roles are created during organization registration: `admin`, `consultant`, `reviewer`, `regulator`, and `viewer`. The legacy `owner` role remains supported for existing local records.

Role behavior:

- ADMIN can manage organization settings, users, projects, documents, and review actions.
- CONSULTANT can create/update projects and upload document versions.
- REVIEWER can read projects/documents and perform review actions, but cannot create projects or upload documents.
- REGULATOR can read/review projects and documents, but cannot create projects or upload documents.
- VIEWER can read projects and documents only.

## API Surface

- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `GET /api/v1/auth/me`
- `GET /api/v1/organizations/me`
- `PATCH /api/v1/organizations/me`
- `POST /api/v1/organizations`
- `GET /api/v1/tenants/me`
- `GET /api/v1/users`
- `POST /api/v1/users`
- `GET /api/v1/projects`
- `POST /api/v1/projects`
- `GET /api/v1/projects/{project_id}`
- `PATCH /api/v1/projects/{project_id}`
- `DELETE /api/v1/projects/{project_id}`
- `GET /api/v1/projects/{project_id}/documents`
- `POST /api/v1/projects/{project_id}/documents/upload`
- `GET /api/v1/documents/project/{project_id}`
- `POST /api/v1/documents/project/{project_id}`
- `GET /api/v1/documents/{document_id}`
- `POST /api/v1/documents/{document_id}/versions`

## Run Sequence

1. Start PostgreSQL from the repo root. Preferred path when Docker is available:

   ```bash
   docker compose up -d postgres
   ```

   Local Windows fallback used in this workspace because Docker is not installed:

   ```bash
   initdb -D .postgres-data -U enviroquant -A trust --encoding=UTF8
   pg_ctl -D .postgres-data -o "-p 55432" -l .postgres-data\postgres.log start
   createdb -h localhost -p 55432 -U enviroquant enviroquant
   ```

2. Install and run backend dependencies from `backend`:

   ```bash
   python -m venv .venv
   .venv\Scripts\activate
   pip install -r requirements.txt
   alembic upgrade head
   uvicorn app.main:app --reload --port 8000
   ```

3. Install and run frontend dependencies from `frontend`:

   ```bash
   npm install
   npm run dev
   ```

## Current Local Verification

- Backend API is running at `http://127.0.0.1:8000`
- Frontend is running at `http://127.0.0.1:3000`
- Workspace-local PostgreSQL is running on port `55432`
- Applied Alembic revision: `0002_rbac_role_alignment`
- API smoke test passed for tenant registration, login, project creation, Cloudinary document upload, and second document version upload
- RBAC smoke test passed: ADMIN created a REVIEWER, REVIEWER could read projects, REVIEWER received `403` for project creation and document upload
- Frontend lint passed
- Frontend typecheck passed
- Frontend production build passed
- Frontend production dependency audit reports `0 vulnerabilities`

## Frontend UI

The frontend now uses Tailwind CSS with shadcn-style primitives:

- `src/components/ui`: button, card, input, label, textarea, badge, alert
- `src/components/layout/app-shell.tsx`: blue EIA Builder shell with top navigation and workspace rail
- `src/app/dashboard`: main dashboard
- `src/app/projects`: project list
- `src/app/projects/new`: project description form
- `src/app/projects/[projectId]`: project workspace
- `src/app/projects/[projectId]/documents`: document upload and version list

## Next Deliverable

Deliverable 2 should add the parsing pipeline:

- PDF and Word parsing adapters
- Structured section extraction
- Heading and paragraph preservation
- Page and positional references
- Parsing logs linked to `document_versions`
