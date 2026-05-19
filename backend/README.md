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

Set `DATABASE_URL` in `.env` before running migrations or the API.
The current local workspace points `DATABASE_URL` at the Neon PostgreSQL database.

## Status

MVP Phase 1 Deliverable 1 foundation.
