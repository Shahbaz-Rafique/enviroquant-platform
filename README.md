# EnviroQuant Platform

EnviroQuant is an AI-assisted environmental intelligence platform for creating, reviewing, and exporting Environmental Impact Assessments (EIAs).

## Project Structure

- `frontend`: Next.js 15 application for project workspaces, EIA drafting, review center, and exports
- `backend`: FastAPI application for auth, RBAC, projects, documents, EIA structure, evaluation, and exports
- `docs`: product requirements, architecture notes, roadmap, and onboarding references
- `docker-compose.yml`: local container stack for PostgreSQL, backend, and frontend

## MVP 1 Coverage

- tenant auth and invitations
- role-based access with `ADMIN`, `PROJECT_MANAGER`, `CONSULTANT`, and `REVIEWER`
- project CRUD and document upload/versioning
- structured 8-section EIA builder
- subsection rich text editing, comments, revisions, and attachments
- legacy EIA source mapping into subsection drafts
- AI-assisted compliance review with traceable findings
- review report export as `JSON`, `DOCX`, and `PDF`
- compiled EIA export as `JSON`, `DOCX`, and `PDF`

Detailed product flows live in [docs/requirements.md](docs/requirements.md) and the milestone roadmap lives in [docs/roadmap.md](docs/roadmap.md).

## Local Setup

### Backend

1. Copy `backend/.env.example` to `backend/.env`.
2. Set `DATABASE_URL`, `SECRET_KEY`, and any optional `CLOUDINARY_*` or `OPENAI_*` values.
3. Create or activate the Python environment.
4. Install dependencies:

```bash
pip install -r backend/requirements.txt
```

5. Run migrations:

```bash
cd backend
alembic upgrade head
```

6. Start the API:

```bash
uvicorn app.main:app --reload --port 8000
```

### Frontend

1. Copy `frontend/.env.example` to `frontend/.env` if you need to override the API URL.
2. Install dependencies:

```bash
cd frontend
npm ci
```

3. Start the frontend:

```bash
npm run dev
```

The frontend defaults to `http://localhost:3000` and the backend to `http://localhost:8000`.

## Docker Setup

Run the full local stack:

```bash
docker-compose up --build
```

This starts:

- PostgreSQL on `5432`
- FastAPI backend on `8000`
- Next.js frontend on `3000`

## Key API Endpoints

- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `GET /api/v1/projects`
- `POST /api/v1/projects`
- `GET /api/v1/projects/{project_id}/documents`
- `POST /api/v1/projects/{project_id}/documents/upload`
- `GET /api/v1/eia-documents/project/{project_id}`
- `POST /api/v1/eia-documents/project/{project_id}`
- `GET /api/v1/eia-documents/{document_id}`
- `PUT /api/v1/eia-documents/subsections/{subsection_id}/content`
- `POST /api/v1/eia-documents/subsections/{subsection_id}/attachments`
- `POST /api/v1/eia-documents/{document_id}/source-mappings/detect`
- `POST /api/v1/eia-documents/{document_id}/evaluation-runs`
- `GET /api/v1/eia-documents/{document_id}/evaluation-runs/{run_id}`
- `GET /api/v1/eia-documents/{document_id}/evaluation-runs/{run_id}/report.{json|docx|pdf}`
- `GET /api/v1/eia-documents/{document_id}/export.{json|docx|pdf}`

## Verification Scenarios

1. Register a tenant admin, log in, and create a project.
2. Upload a baseline study or previous EIA into the project workspace.
3. Create a structured EIA document and verify the seeded checklist sections appear.
4. Edit a subsection in the focused workspace, upload an attachment, and confirm a revision is recorded.
5. Detect source mappings from an uploaded legacy report and apply one suggested draft.
6. Queue an evaluation run from the review center and verify findings, evidence references, and section summaries appear.
7. Compare two evaluation runs after revising content.
8. Export the review package and the compiled EIA in all three formats.

## Remaining TODOs

- introduce a reusable master checklist catalog table
- add stronger real-time collaboration primitives
- add regulator-facing review workflows beyond reviewer comments
- move long-running evaluation work to a dedicated job queue
