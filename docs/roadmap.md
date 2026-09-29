# EnviroQuant MVP 1 Roadmap

## Current Scope

MVP 1 is organized into three delivery phases that together cover structured EIA authoring, project collaboration, versioned evidence, AI-assisted validation, and exportable review artifacts.

## Phase 1: Foundation and Core Platform

Status: implemented and documented

- FastAPI backend and Next.js frontend live in a clean monorepo.
- Tenant auth, invitation flow, JWT sessions, and RBAC are in place.
- Project CRUD, evidence uploads, document versioning, and parser output are implemented.
- Structured EIA documents are created with seeded checklist sections and subsections.
- Tenant roles are aligned to the MVP operating model: `ADMIN`, `PROJECT_MANAGER`, `CONSULTANT`, `REVIEWER`.

## Phase 2: EIA Builder, Workspace, and Versioning

Status: implemented

- Structured subsection builder and focused rich text workspace are live.
- Comments, revisions, attachment management, and document-level membership are implemented.
- Source mapping workflow supports legacy EIA detection, suggested content, and application into subsections.
- Progress tracking and readiness states are available per subsection and per section.

## Phase 3: Validation, Compliance Review, and Reporting

Status: implemented

- Evaluation runs can be queued asynchronously from the review center.
- The pipeline routes parsed document chunks and confirmed source mappings into checklist analysis.
- Deterministic compliance classification and OpenAI-backed evaluation are both supported.
- Reviewer comments, run comparison, and exportable review reports are available.
- Compiled EIA document exports are available alongside review report exports.

## Deployment Strategy

### Local Development

- Run PostgreSQL through `docker-compose up postgres`.
- Run the backend with `uvicorn app.main:app --reload --port 8000`.
- Run the frontend with `npm run dev`.

### Container Deployment

- `docker-compose up --build` starts `postgres`, `backend`, and `frontend`.
- Backend migrations run automatically during container startup.
- Frontend serves the production Next.js build on port `3000`.
- Backend serves the FastAPI API on port `8000`.

### Environment Requirements

- PostgreSQL 16+
- Python 3.11+
- Node.js 22+
- Optional Cloudinary credentials for file storage
- Optional OpenAI API key for model-backed evaluation

## Near-Term TODOs After MVP 1

- add a persistent master checklist catalog instead of relying only on per-document seeded mappings
- add real-time collaboration transport instead of refresh-based coordination
- add reviewer approval workflows and regulator-facing read-only portal
- add stronger source mapping detection using model-assisted section extraction
- add background job queue infrastructure for large review batches
