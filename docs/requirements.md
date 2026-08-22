# EnviroQuant MVP 1 Requirements

## Product Goal

EnviroQuant MVP 1 enables consultant teams to build a structured Environmental Impact Assessment (EIA), connect each subsection to evidence, run a checklist-driven AI review, collaborate on revisions, and export both the compiled EIA and the review findings package.

## Primary User Roles

- `ADMIN`: governs the tenant, manages users, and has full platform access.
- `PROJECT_MANAGER`: creates and manages projects, documents, uploads, and review workflows.
- `CONSULTANT`: drafts EIA content, uploads evidence, collaborates on subsections, and prepares submissions.
- `REVIEWER`: runs validation, inspects findings, comments on compliance gaps, and compares review runs.

Legacy compatibility remains in code for existing tenants using older roles, but new team setup should use the four roles above.

## Consultant Workflow

### 1. Create Project

1. Create a project with sector, country, location, and description metadata.
2. Invite project participants at the tenant level.
3. Open the project workspace to start evidence uploads and EIA drafting.

### 2. Build Sections

1. Create a structured EIA document from the project workspace.
2. Seed the document with the full 8-section EIA checklist architecture.
3. Navigate through sections and subsections from the checklist sidebar.
4. Track subsection progress and readiness for review.

### 3. Add Evidence

1. Upload project evidence such as PDFs, DOCX files, images, maps, permits, and legacy EIAs.
2. Parse uploaded files into versioned document chunks.
3. Attach supporting files directly to subsections.
4. Detect source mappings from legacy reports or previous EIAs and apply suggested draft content where appropriate.

### 4. Draft and Collaborate

1. Edit subsection content in the focused workspace using the rich text editor.
2. Add tables, lists, paragraphs, and embedded images.
3. Save revisions automatically and manually.
4. Assign collaborators at the EIA document level.
5. Use comments, replies, and resolution state to move drafting forward.

### 5. Run Review

1. Open the review center from the EIA builder.
2. Queue an evaluation run against either a selected source document or the full current project evidence set.
3. Route document chunks and source mappings to checklist items.
4. Review deterministic or OpenAI-backed findings with traceable evidence references.
5. Compare evaluation runs to understand progress between revisions.

### 6. Export

1. Export the compiled EIA document as `PDF`, `DOCX`, or `JSON`.
2. Export the review findings package as `PDF`, `DOCX`, or `JSON`.
3. Use the latest run summary and evidence references for submission packaging.

## Reviewer Workflow

1. Open an existing project EIA document in the review center.
2. Queue or inspect immutable evaluation runs.
3. Filter findings by section and compliance state.
4. Review evidence excerpts, chunk references, page numbers, and subsection traceability.
5. Add reviewer comments to findings.
6. Compare the active run against a baseline run before sign-off.
7. Export the review package for circulation.

## Checklist Architecture

The platform uses a modular hierarchy:

- `EIA Document`
- `Section`
- `Subsection`
- `Checklist Mapping`
- `Supporting Attachment`
- `Revision`
- `Evaluation Run`
- `Finding`

The seeded structure contains all 8 checklist sections:

1. Description of the Project
2. Consideration of Alternatives
3. Description of the Environment Likely to Be Affected
4. Description of the Likely Significant Effects
5. Description of Mitigation
6. Non-Technical Summary
7. Regulatory Framework
8. Quality of Presentation

## Compliance Classification Rules

The review engine classifies findings using deterministic statuses:

- `COMPLIANT`
- `PARTIALLY_COMPLIANT`
- `NEEDS_IMPROVEMENT`
- `MISSING_INFORMATION`
- `NEEDS_REVIEW`

Each finding must include:

- checklist section reference
- subsection traceability
- evidence summary
- AI analysis
- missing elements
- recommendation
- evidence references to document chunks, subsection text, or source mappings

## MVP Acceptance Criteria

- A consultant can create a project and create a structured EIA document.
- The structured EIA contains the complete seeded 8-section checklist hierarchy.
- A consultant can draft subsection content and attach evidence.
- Subsection comments, revisions, and progress updates are persisted.
- Previous EIAs or legacy reports can be uploaded, chunked, and mapped to subsections.
- A reviewer can queue an evaluation run and inspect traceable findings.
- A reviewer can compare evaluation runs and add reviewer comments.
- The compiled EIA and the review package can both be exported as `PDF`, `DOCX`, and `JSON`.
