# EnviroQuant Platform

AI-powered environmental intelligence platform for Environmental Impact Assessment (EIA) creation, analysis, and regulatory compliance.

## Vision

Build a structured environmental intelligence platform for faster, more traceable, and more reliable environmental decision-making.

## Core Capabilities

- EIA creation support
- AI-powered impact analysis
- Regulatory compliance validation
- Environmental data intelligence
- Automated reporting

## Current Implementation

MVP Phase 1 Deliverable 1 is scaffolded as:

- `backend`: FastAPI modular monolith with PostgreSQL, auth, RBAC, tenants, projects, uploads, and document versions
- `frontend`: Next.js + Tailwind CSS dashboard, project creation UI, login/register flow, project workspace, and document upload pages
- `docker-compose.yml`: optional local PostgreSQL service; the backend uses `DATABASE_URL` from `backend/.env`
- `docs/phase-1-deliverable-1-context.md`: implementation context and API map

## Next Steps

- Deliverable 2: parsing pipeline for PDF and Word documents
- Deliverable 3: chunking and traceable evidence references
- Deliverable 4: checklist mapping for EIA sections

Built by EnviroQuant.
