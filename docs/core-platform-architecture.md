# EnviroQuant Core Platform Architecture

EnviroQuant is an AI-powered environmental intelligence platform designed to support the full lifecycle of Environmental Impact Assessments (EIA), from document upload and analysis to compliance validation, scoring, review, and reporting.

The platform is designed as an evidence-based environmental reasoning system, not a general chatbot. Every finding must be traceable to uploaded evidence, approved standards, or structured project metadata.

## Core Principle

EnviroQuant must never generate environmental conclusions without evidence.

Every output should clearly separate:

- Evidence Found
- AI Interpretation
- Missing Information
- Recommendation
- Confidence Level
- Source Reference

## Main Platform Layers

1. Web Platform
2. Backend API
3. Database
4. File Storage
5. AI Engine Core
6. Review & Scoring Layer
7. Reporting Layer
8. Learning & Benchmarking Layer

## Users

- Consultants
- Reviewers
- Regulators
- Project Developers
- Companies
- Auditors / ESG Reviewers

## AI Intelligence Layers

1. Project Intelligence Engine
2. Standards Intelligence Engine
3. Document Intelligence Engine
4. Evidence Graph Engine
5. Gap Detection Engine
6. Environmental Reasoning Engine
7. Drafting / Authoring Engine
8. Review Support Engine
9. Learning & Benchmark Engine

## Developer Architecture Principles

### 1. Versioned Evaluation Runs
Every checklist, prompt, model, scoring rule, and evaluation run must be versioned.

Old results must never be overwritten.

### 2. Immutable Audit Trail
Every finding should store:

- project_id
- document_id
- document_version_id
- page_number
- section_id
- chunk_id
- checklist_item_id
- prompt_version
- model_version
- scoring_version
- run_id
- evidence_reference
- confidence_score

### 3. Deterministic Scoring Outside the LLM
The LLM should extract evidence and structured findings.

Scoring should be performed by deterministic rules/code, not by the LLM.

### 4. Hybrid Retrieval
The system should use:

1. deterministic section routing
2. scoped semantic retrieval
3. evidence selection
4. structured AI evaluation

### 5. Human Review Queue
Low-confidence, conflicting, or incomplete findings should be routed to human review.

### 6. Re-run Comparison
Users should be able to compare different evaluation runs across versions.

### 7. Structured JSON Outputs
All AI agents should return schema-controlled JSON outputs.

### 8. Multi-Tenant SaaS Design
Each client organisation must have isolated users, projects, documents, runs, and results.

## Status

Architecture foundation in progress.
