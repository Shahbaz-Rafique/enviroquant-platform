# EnviroQuant Backend

FastAPI backend for the EnviroQuant MVP foundation.

## Responsibilities

- Multi-tenant workspace boundary
- JWT authentication
- Role-based access control
- Project metadata APIs
- PDF and Word document uploads
- Immutable document version records

## Local Setup

```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload --port 8000
```

The default database URL expects the root `docker-compose.yml` PostgreSQL service.
For the current local workspace, `.env` points to the workspace-local PostgreSQL fallback on port `55432`.

## Status

MVP Phase 1 Deliverable 1 foundation.
