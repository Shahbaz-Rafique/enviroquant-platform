# Production deployment and recovery strategy

## Required services

- Two or more stateless FastAPI instances behind TLS termination.
- Two or more Next.js instances behind the application gateway.
- Managed PostgreSQL 16 with encryption, point-in-time recovery, and daily snapshots.
- At least one `python -m app.workers.evaluation_worker` process.
- Cloudinary or an equivalent private object store for evidence files.

Run `alembic upgrade head` and `python -m app.commands.sync_checklists` once during a release, before starting new API instances.

## Environments and releases

Maintain separate development, staging, and production databases, object stores, OpenAI projects, secrets, and tenant data. Promote the same immutable images from staging to production.

1. Back up PostgreSQL and verify the latest restore point.
2. Run the migration and checklist synchronization job.
3. Deploy evaluation workers.
4. Roll out backend instances with readiness checks.
5. Roll out frontend instances and run an authenticated smoke test.
6. Verify queue age, errors, uploads, evaluations, and report generation.

## Monitoring

Alert on API 5xx rate, authentication failures, database saturation, pending evaluation age, failed evaluations, worker availability, storage failures, SMTP failures, and OpenAI timeout/fallback rate. Logs should include tenant, project, document, evaluation-run and audit identifiers without storing document text.

## Backup, recovery, and rollback

- Retain PostgreSQL point-in-time recovery for at least 30 days and daily snapshots for 90 days.
- Perform a quarterly restore exercise.
- Enable object-store versioning for uploaded evidence.
- Roll back application images first. Prefer forward-fix migrations over schema downgrades.
- Restore the pre-release snapshot only when data integrity is at risk.

## Production security checklist

- Replace all default secrets and credentials.
- Restrict CORS to production origins.
- Use private networking and least-privilege service accounts.
- Scan containers and dependencies in CI.
- Rotate application, SMTP, storage, and OpenAI secrets.
- Review audit logs and tenant/document authorization tests before release.
