# EnviroQuant Backend

FastAPI backend for the EnviroQuant MVP foundation.

## Responsibilities

- Multi-tenant workspace boundary
- JWT authentication
- Role-based access control
- Project metadata APIs
- PDF and Word document uploads
- PDF, DOCX, text, spreadsheet, and image-OCR extraction
- Immutable document version records
- Deterministic, versioned EIA compliance classification
- Regulation and standards knowledge records
- Durable database-backed evaluation queue

## Local Setup

```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
alembic upgrade head
python -m app.commands.sync_checklists
uvicorn app.main:app --reload --port 8000
```

Run the evaluation worker in a second terminal:

```bash
python -m app.workers.evaluation_worker
```

Set `DATABASE_URL` in `.env` before running migrations or the API.
The current local workspace points `DATABASE_URL` at the Neon PostgreSQL database.
Standard `postgres://` and `postgresql://` URLs are automatically configured to use the
installed Psycopg 3 driver.
`DATABASE_CONNECT_TIMEOUT_SECONDS` controls how quickly the API reports an unavailable database
instead of leaving requests waiting on the database driver's longer default timeout.

Development and production checks are defined in `.github/workflows/ci.yml`.
