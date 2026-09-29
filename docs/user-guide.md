# EnviroQuant Platform User Guide

**EnviroQuant™ — AI-Powered Environmental Intelligence Platform**

*Evidence Before Conclusions™*

---

## Table of Contents

1. [Getting Started](#1-getting-started)
2. [Registration and Organisation Setup](#2-registration-and-organisation-setup)
3. [User Roles and Permissions](#3-user-roles-and-permissions)
4. [Team Management](#4-team-management)
5. [Project Creation](#5-project-creation)
6. [Document Upload and Evidence](#6-document-upload-and-evidence)
7. [Creating an EIA Document](#7-creating-an-eia-document)
8. [Section Assignment and Collaboration](#8-section-assignment-and-collaboration)
9. [Developing Subsection Content](#9-developing-subsection-content)
10. [Review Workflow](#10-review-workflow)
11. [AI Compliance Evaluation](#11-ai-compliance-evaluation)
12. [Formal Review and Approval](#12-formal-review-and-approval)
13. [EIA Progress Dashboard](#13-eia-progress-dashboard)
14. [Regulator Insights](#14-regulator-insights)
15. [Export and Reporting](#15-export-and-reporting)
16. [Quick Reference](#16-quick-reference)

---

## 1. Getting Started

### Platform Overview

EnviroQuant is an AI-powered Environmental Intelligence Platform that enables consultant teams to create, review, and export structured Environmental Impact Assessments (EIAs). The platform supports the full EIA lifecycle: from project creation and evidence collection, through collaborative authoring and checklist-driven compliance evaluation, to formal review, approval, and export.

EnviroQuant follows the **Evidence Before Conclusions** philosophy. Every finding, compliance judgement, and recommendation is grounded in traceable evidence — document chunks, subsection content, and source mappings — so that no conclusion stands without a verifiable basis.

### System Requirements

- A modern web browser (Chrome, Firefox, Safari, or Edge — current or previous major version)
- A stable internet connection
- No software installation is required; EnviroQuant is a fully browser-based platform

### Accessing the Platform

Navigate to the EnviroQuant platform URL provided by your organisation administrator. From the landing page you can register a new account, sign in to an existing account, or accept a team invitation.

---

## 2. Registration and Organisation Setup

### Creating Your Account

1. Select **Register** from the landing page.
2. Complete the registration form with the following fields:
   - **Organisation Name** — the name of your consulting firm or agency.
   - **Organisation Slug** (optional) — a short URL-friendly identifier for your organisation. If left blank, one is generated automatically.
   - **Full Name** — your name as it will appear to collaborators.
   - **Email** — your professional email address. This serves as your login credential.
   - **Password** — a secure password for your account.
3. Select **Create organisation** to complete registration.

### What Happens on Registration

- A new **organisation** (tenant) is created automatically.
- You are assigned the **ADMIN** role, giving you full platform access.
- You are redirected to the Dashboard, where you can begin creating projects and inviting team members.

> **Note:** Subsequent team members do not register independently. Instead, the Admin invites them from the Team page (see Section 4).

---

## 3. User Roles and Permissions

EnviroQuant uses four primary roles. Each role determines what actions a user can perform and which portal views are available.

### Role Definitions

| Role | Portal Access | Description |
|------|--------------|-------------|
| **ADMIN** | Administration portal | Full platform access. Manages the organisation, users, projects, and all review workflows. Can perform any action available to other roles. |
| **PROJECT_MANAGER** | Project management portal | Creates and manages projects, EIA documents, document uploads, team assignments, and review workflows. |
| **CONSULTANT** | Consultant portal | Drafts EIA subsection content, uploads evidence, collaborates on subsections, and prepares submissions for review. |
| **REVIEWER** | Reviewer portal | Runs AI compliance evaluations, inspects findings, verifies evidence, reviews subsection quality, and participates in formal approval decisions. |

### Detailed Permission Breakdown

**ADMIN capabilities:**
- All permissions listed below for every other role
- Organisation (tenant) management
- User account management: invite, activate, deactivate, and assign roles
- Full assignment management across all EIA documents

**PROJECT_MANAGER capabilities:**
- Create, update, and delete projects
- Upload and manage project documents and versions
- Create and manage EIA documents
- Assign authors and reviewers to sections and subsections
- Manage review workflows and approvals
- Read all reviews and evaluations

**CONSULTANT capabilities:**
- Access the author portal for assigned EIA documents
- Draft and edit subsection content within assigned sections
- Upload evidence attachments to subsections
- Use the AI Authoring Assistant
- Submit completed work for review
- Participate in comments and threaded discussions

**REVIEWER capabilities:**
- Access the reviewer portal
- Queue and inspect AI evaluation runs
- Filter and review compliance findings
- Add reviewer comments to findings
- Compare evaluation runs
- Begin subsection reviews, request revisions, or approve subsections
- Participate in formal review approval decisions

---

## 4. Team Management

### Inviting Team Members

Team members are invited at the organisation level from the **Team** page.

1. Navigate to the **Team** page from the main navigation sidebar.
2. Select **Invite member**.
3. Enter the invitee's **email address**, **full name**, and assign a **role** (Admin, Project Manager, Consultant, or Reviewer).
4. The platform generates an invitation link. If email delivery is configured, the invitee receives the link by email; otherwise, share the link directly.
5. The invitee follows the link to the **Accept Invite** page, sets their password, and joins the organisation.

### Document-Level Roles

In addition to organisation-level roles, users can be assigned document-level roles on individual EIA documents. These control what a user can do within a specific EIA:

| Document Role | Capabilities |
|--------------|-------------|
| **EDITOR** | Full editing access — can author subsection content, manage attachments, and submit for review |
| **REVIEWER** | Can review subsections, approve or request revisions, and add comments |
| **COMMENTER** | Can add comments and participate in discussions but cannot edit content |
| **VIEWER** | Read-only access to the EIA document |

Document-level members can be added from the **Team** tab within the EIA Document Builder (see Section 8).

---

## 5. Project Creation

A project is the top-level container that groups all evidence, EIA documents, and evaluations for a single environmental assessment engagement.

### Creating a New Project

1. Navigate to **Projects** from the main navigation sidebar.
2. Select **New project**.
3. Complete the project form:
   - **Project Name** (required) — a descriptive name for the engagement.
   - **Sector** — the industry sector (e.g., Oil and Gas, Infrastructure, Energy).
   - **Country** — the country where the project is located.
   - **Location** — the specific site or region.
   - **Description** — a summary of the project scope and objectives.
   - **Capacity** — the project's operational capacity, where applicable.
   - **Timeline** — the anticipated project timeline.
   - **Project Components** — select applicable infrastructure components (Access Roads, Buildings and Facilities, Power Supply, Water Management, Waste Treatment).
4. Select **Save** to create the project.

### Project Workspace

After creation, you are taken to the **Project Workspace**. This is the central hub for the project, where you can:

- Upload source documents and evidence
- Create EIA documents
- Access the Review Center and Regulator Insights
- View project documents and their parsing status

---

## 6. Document Upload and Evidence

Source documents provide the evidence base for your EIA. EnviroQuant parses uploaded documents into structured, searchable chunks that can be traced back to specific pages and sections.

### Uploading Documents

1. From the Project Workspace, navigate to the **Documents** section.
2. Select **Upload document** or drag and drop files into the upload area.
3. For each uploaded file, specify the **document type**:
   - **EIA Report** — a current or in-progress EIA document
   - **Previous EIA** — an earlier EIA for the same site or project
   - **Legacy Report** — an older environmental report to be used as a reference
   - **Supporting Document** — permits, correspondence, technical studies
   - **Baseline Study** — environmental baseline survey data
4. The document is uploaded and queued for parsing.

### Document Parsing and Chunks

Once uploaded, EnviroQuant automatically parses each document into **document chunks** — discrete, page-referenced segments of content. Each chunk retains:

- The original page number
- The section number and title (where detectable)
- The heading hierarchy
- The extracted text content

These chunks serve as traceable evidence references throughout the platform — in compliance evaluations, source mappings, and finding reports.

### Document Versioning

Documents support multiple versions. To upload a revised version of an existing document:

1. Open the document from the project's document list.
2. Select **Upload new version**.
3. The new version is parsed independently, preserving the full history of prior versions.

---

## 7. Creating an EIA Document

An EIA document is the structured assessment that your team will author, review, and export.

### Creating a New EIA

1. From the Project Workspace, select **Create EIA document**.
2. Enter a **title** for the EIA document.
3. The platform automatically seeds the document with the complete **8-section EIA checklist architecture**.

### The 8 Standard EIA Sections

Every EIA document follows a standardised structure with eight top-level sections:

| Section | Title |
|---------|-------|
| 1 | Description of the Project |
| 2 | Consideration of Alternatives |
| 3 | Description of the Environment Likely to Be Affected |
| 4 | Description of the Likely Significant Effects |
| 5 | Description of Mitigation |
| 6 | Non-Technical Summary |
| 7 | Regulatory Framework |
| 8 | Quality of Presentation |

Each section contains multiple **subsections** that correspond to specific checklist items (e.g., Section 1 contains over 40 subsections covering project need, components, emissions, waste, and risk).

### Seeding from a Source Document

When creating an EIA, you may optionally seed it from an uploaded source document. The platform analyses the source document's chunks and generates **source mappings** — suggested content for subsections based on detected matches. These mappings can be reviewed, confirmed, or rejected before being applied (see Section 9).

### Understanding the EIA Hierarchy

```
EIA Document
  └── Section (e.g., "1. Description of the Project")
        └── Subsection (e.g., "1.1.1 Are the need and objectives explained?")
              ├── Content (rich text authored in the editor)
              ├── Checklist Mapping (compliance criteria)
              ├── Attachments (evidence files)
              ├── Source Mappings (auto-detected content)
              ├── Revisions (version history)
              └── Comments (threaded discussions)
```

---

## 8. Section Assignment and Collaboration

### Assigning Authors and Reviewers

Admins and Project Managers can assign specific team members to sections and subsections as authors or reviewers.

1. Open the EIA document in the **Document Builder**.
2. Navigate to the **Assignments** view from the workspace navigation.
3. For each section or subsection, assign:
   - **Author** — the specialist responsible for drafting the content.
   - **Reviewer** — the person responsible for reviewing and approving the content.
   - **Due Date** — the target completion date.
   - **Blocked Status** — mark a subsection as blocked with an explanatory reason if work cannot proceed.

### Assignment Inheritance

Assignments can be made at the **section level** or the **subsection level**:

- **Section-level assignment**: The assigned author and reviewer are inherited by all subsections within that section, unless a subsection has its own explicit assignment.
- **Subsection-level assignment**: Overrides the section-level assignment for that specific subsection.

Each subsection displays its **assignment source** (either "Section" or "Subsection") so team members understand where their assignment originates.

### The My Work View

Team members can access the **My Work** view within the Document Builder to see only the subsections assigned to them. Each work item displays:

- The section and subsection reference
- The current workflow status
- The assignment role (Author, Reviewer, or both)
- The due date and overdue status
- Unresolved comment count

### Adding Document-Level Team Members

From the **Team** tab in the Document Builder:

1. Select **Add member**.
2. Enter the user's email address or select from the organisation's user list.
3. Assign a document role: Editor, Reviewer, Commenter, or Viewer.
4. The member receives an invitation and gains access to the EIA document.

---

## 9. Developing Subsection Content

### The Subsection Workspace

Selecting a subsection from the Document Builder opens the **Subsection Workspace** — the focused authoring environment for that checklist item.

The workspace is organised into several areas:

- **Rich Text Editor** — the central editing area powered by TipTap
- **Checklist Panel** — compliance checklist items mapped to this subsection
- **Attachments Panel** — evidence files attached to this subsection
- **Comments Panel** — threaded discussions with team members
- **Revision Panel** — version history with restore capability
- **Workflow Actions** — status transition controls
- **Collaboration Indicators** — current assignees and active collaborators

### Writing Content

The rich text editor supports:

- Headings, paragraphs, and block quotes
- Bullet lists and numbered lists
- Tables with row and column controls
- Inline images
- Bold, italic, and other text formatting

### AI Authoring Assistant

The Subsection Workspace includes an AI-powered authoring assistant that can help draft and improve content. Four actions are available:

| Action | Description |
|--------|-------------|
| **Outline** | Generates a structured outline for the subsection based on the checklist requirements and available evidence |
| **Evidence Gaps** | Analyses the current content against checklist criteria and identifies missing evidence or coverage gaps |
| **Generate Draft** | Produces a complete draft for the subsection using available evidence, source mappings, and checklist requirements |
| **Improve Draft** | Reviews the existing content and suggests improvements for clarity, completeness, and compliance alignment |

To use the assistant:

1. Select the **AI Assistant** button in the workspace toolbar.
2. Choose an action (Outline, Evidence Gaps, Generate Draft, or Improve Draft).
3. Optionally provide additional instructions to guide the output.
4. Review the generated content. You can copy it into the editor, use it as a reference, or discard it.

### Checklist Compliance Mapping

Each subsection is mapped to one or more **checklist items** from the EIA standard. The Checklist Panel displays:

- The checklist section reference and title
- The importance level (High, Medium, or Low)
- The current compliance status (Compliant, Partially Compliant, or Missing)

Use the checklist panel as a guide to ensure your content addresses all required criteria.

### Source Document Mappings

If the EIA was seeded from a source document, or if source documents have been parsed, the platform may detect **source mappings** — content from uploaded documents that corresponds to the current subsection.

Each mapping shows:

- The source document filename and version
- The detected section number and title
- The suggested content (as formatted HTML)
- A confidence score indicating match quality
- The current status: Suggested, Needs Review, Confirmed, Applied, or Rejected

You can review each mapping and choose to **apply** it (inserting the content into the editor), **confirm** it (marking it as relevant without applying), or **reject** it.

### Attaching Evidence Files

1. Open the **Attachments** panel in the Subsection Workspace.
2. Select **Upload attachment** or drag and drop files.
3. The attachment is linked to the current subsection and can reference a specific checklist item.
4. Attached files appear as traceable evidence in compliance evaluations.

### Revision History

Every save creates a new **revision** entry. The Revision Panel displays a chronological list of all revisions for the subsection, including:

- Revision number
- The user who made the change
- The change summary
- A timestamp
- The source type (manual edit, AI-generated, source mapping applied)

To restore a previous revision, select the revision entry and choose **Restore**. This creates a new revision with the restored content.

### Comments and Discussions

The Comments Panel supports threaded discussions on each subsection:

1. Select **Add comment** and type your message.
2. Team members can reply to existing comments, creating threaded conversations.
3. Comments can be marked as **resolved** when the issue is addressed.
4. Unresolved comment counts are visible in assignment views and the review queue.

### Autosave and Conflict Detection

- Content is saved automatically as you work. A **save indicator** in the workspace toolbar shows the current save state (Saved, Saving, or Error).
- You can also save manually using the **Save** button.
- If another team member edits the same subsection concurrently, the platform detects the conflict and displays a **newer version available** warning, allowing you to reload the latest content.

---

## 10. Review Workflow

### The 7-State Workflow

Each subsection follows a governed workflow with seven states:

```
Not Started → Assigned → In Progress → Ready for Review → Under Review → Revision Required → Approved
```

| Status | Description |
|--------|-------------|
| **Not Started** | No author or reviewer has been assigned yet |
| **Assigned** | An author has been assigned but work has not begun |
| **In Progress** | The author is actively drafting content |
| **Ready for Review** | The author has submitted the subsection for review |
| **Under Review** | A reviewer is actively reviewing the content |
| **Revision Required** | The reviewer has requested changes to the content |
| **Approved** | The reviewer has approved the subsection (content is locked) |

### Author Transitions

Authors drive the content through the early workflow stages:

1. **Start work** — Moves the subsection from Assigned to In Progress. Available when the subsection is in the Assigned state.
2. **Submit for review** — Moves the subsection from In Progress to Ready for Review. This signals to reviewers that the content is complete and ready for assessment.
3. **Start revision** — Moves the subsection from Revision Required back to In Progress. Available after a reviewer has requested changes.

### Reviewer Transitions

Reviewers manage the quality gate:

1. **Start review** — Moves the subsection from Ready for Review to Under Review. This claims the subsection for active review.
2. **Request revisions** — Moves the subsection from Under Review to Revision Required. A decision comment is required, explaining what changes are needed.
3. **Approve subsection** — Moves the subsection from Under Review to Approved. The content is locked and marked as final.

### Section-Level Approval

The **Review Queue** in the Document Builder and the Reviewer Portal displays all subsections that are Ready for Review or Under Review. Reviewers can work through the queue systematically, and when all subsections within a section are approved, the section is considered complete.

### Resolving Comments

Before approving a subsection, reviewers should ensure all comments are resolved. The unresolved comment count is displayed in the review queue and assignment views, helping reviewers identify outstanding discussions.

---

## 11. AI Compliance Evaluation

### Running an Evaluation

The **Review Center** provides AI-powered compliance evaluation of your EIA document.

1. Open the EIA document and navigate to the **Review Center**.
2. Optionally select a **source document** to evaluate against (or evaluate against the full project evidence set).
3. Select **Run evaluation** to queue a new evaluation run.
4. The evaluation processes each checklist item, analyses the subsection content and available evidence, and generates compliance findings.

> **Note:** Each evaluation run is **immutable** — once completed, its findings cannot be modified. This ensures a traceable audit trail.

### Understanding Evaluation Results

Each evaluation run produces:

- **Section Summaries** — An overall compliance score for each of the 8 sections, with counts of findings by status.
- **Individual Findings** — A detailed assessment for each checklist item, including:

| Finding Field | Description |
|--------------|-------------|
| Status | Compliant, Partially Compliant, Needs Improvement, Missing, or Needs Review |
| Adequacy | A qualitative assessment of content quality |
| Confidence Score | The AI engine's confidence in the assessment (0-100) |
| Evidence Summary | A summary of the evidence found for this checklist item |
| AI Analysis | The detailed analytical reasoning behind the finding |
| Recommendation | Specific actions to improve compliance |
| Missing Elements | A list of elements that were expected but not found |
| Evidence References | Traceable links to document chunks, subsections, and source documents |

### Finding Statuses

| Status | Meaning |
|--------|---------|
| **Compliant** | The subsection fully addresses the checklist requirements with adequate evidence |
| **Partially Compliant** | Some requirements are addressed but gaps remain |
| **Needs Improvement** | Content exists but requires significant strengthening |
| **Missing** | No content or evidence was found for this checklist item |
| **Needs Review** | The AI was unable to make a confident determination; human review is required |

### Evaluation Run Comparison

To track improvement over time:

1. In the Review Center, select a **baseline run** from the run history dropdown.
2. The platform displays a comparison showing:
   - Overall score delta between the current and baseline runs
   - Section-by-section score changes
   - Individual findings that changed status between runs
3. Use this comparison to verify that revisions have addressed previously identified gaps.

### Evaluation Report Export

Evaluation reports can be exported in three formats from the **Exports** card in the Review Center:

- **JSON** — Machine-readable structured data for integration with other systems
- **DOCX** — A formatted Word document suitable for circulation and markup
- **PDF** — A print-ready document for formal submission

---

## 12. Formal Review and Approval

### Requesting Formal Review

Once an AI evaluation has been completed, authorised users can request a formal review:

1. In the Review Center, locate the **Formal Review** section.
2. Select **Request review**.
3. Add a **request note** explaining the review context and any specific areas of concern.
4. The review request is recorded with a timestamp and linked to the current evaluation run.

> **Note:** A completed evaluation run is required before a formal review can be requested.

### Reviewer Decision

Reviewers with approval authority can respond to a formal review request:

1. Open the Review Center and navigate to the formal review section.
2. Review the evaluation findings, section scores, and any reviewer comments.
3. Add a **decision note** explaining the rationale.
4. Choose one of two decisions:
   - **Approve** — The EIA document meets the required standard. The document status moves to Approved.
   - **Request Changes** — The EIA requires further work. The document status moves to Changes Requested, and the consultant team is notified.

### Document Status Lifecycle

The formal review process follows a document-level lifecycle:

```
Draft → In Review → Approved
                  → Changes Requested → (revise and re-submit) → In Review
```

---

## 13. EIA Progress Dashboard

### Management Dashboard

The **Management Dashboard** within the Document Builder provides Admins and Project Managers with a comprehensive view of EIA progress.

### Overall Progress

- **Progress percentage** — An aggregate completion metric calculated from all subsection progress values.
- **Progress bar** — A visual indicator of overall document completion.

### Section-Level Detail

Each section displays:

- The section number and title
- Completion status and progress percentage
- The number of total, completed, and in-progress subsections
- The current assignee (author and reviewer)

### Attention Flags

The dashboard highlights sections that require management attention with the following flags:

| Flag | Meaning |
|------|---------|
| **Overdue** | The section or subsection has passed its due date |
| **Blocked** | Work has been explicitly blocked, with a stated reason |
| **Unassigned** | No author or reviewer has been assigned |
| **Review Ready** | Subsections are waiting for reviewer action |

Selecting a flagged section navigates to the relevant subsection for immediate action.

---

## 14. Regulator Insights

The **Regulator Insights** view provides cross-EIA intelligence for Admins, Reviewers, and Regulator-role users. Access it from the project workspace.

### Cross-EIA Benchmarking

A benchmark table displays all EIA documents within the project, showing:

- Document title and status
- The latest evaluation score
- The latest appraisal result
- The approval status

### Compliance Trend Analysis

A trend view plots evaluation scores over time across all EIA documents in the project, enabling you to track quality improvement and identify regressions.

### Cross-Document Comparison

To compare two EIA documents side by side:

1. Select the **left document** and **right document** from the dropdown menus.
2. The platform displays:
   - Overall scores and delta
   - Status count breakdowns for each document
   - Section-by-section score comparisons

### Audit Decision Trail

The Regulator Insights view includes a record of all formal review decisions (approvals and change requests) across the project, providing a complete audit trail.

---

## 15. Export and Reporting

### Compiled EIA Export

Export the complete EIA document from the Document Builder:

1. Open the EIA document in the Document Builder.
2. Select **Export PDF** (or choose from JSON, DOCX, and PDF options).
3. The exported file includes all sections, subsections, and their authored content in a structured format.

Available formats:

| Format | Best For |
|--------|----------|
| **PDF** | Formal submission and print distribution |
| **DOCX** | Editing, markup, and internal circulation |
| **JSON** | Programmatic access and integration with external systems |

### Evaluation Report Export

Export evaluation findings from the Review Center:

1. Open the Review Center and select the evaluation run to export.
2. Under the **Exports** card, choose **JSON**, **DOCX**, or **PDF**.
3. The report includes section summaries, individual findings, compliance statuses, evidence references, and recommendations.

### What Is Included in Each Export

**Compiled EIA (Document Builder export):**
- All 8 sections and their subsections
- Authored content in its final form
- Document metadata (title, project, status)

**Evaluation Report (Review Center export):**
- Evaluation run metadata (date, model, scope)
- Section-by-section compliance scores and summaries
- Individual findings with statuses, evidence summaries, AI analysis, and recommendations
- Evidence references with document chunk traceability (page numbers, source files)
- Missing elements and gap analysis

---

## 16. Quick Reference

### Workflow Status Definitions

| Status | Who Acts | Action Available |
|--------|----------|-----------------|
| Not Started | Admin / PM | Assign an author or reviewer |
| Assigned | Author | **Start work** |
| In Progress | Author | **Submit for review** |
| Ready for Review | Reviewer | **Start review** |
| Under Review | Reviewer | **Request revisions** or **Approve subsection** |
| Revision Required | Author | **Start revision** |
| Approved | — | Content is locked |

### Role Permission Matrix

| Capability | Admin | Project Manager | Consultant | Reviewer |
|-----------|-------|----------------|------------|----------|
| Manage organisation and users | Yes | — | — | — |
| Create and manage projects | Yes | Yes | — | — |
| Upload project documents | Yes | Yes | — | — |
| Create EIA documents | Yes | Yes | — | — |
| Assign authors and reviewers | Yes | Yes | — | — |
| Author subsection content | Yes | Yes | Yes | — |
| Upload evidence attachments | Yes | Yes | Yes | — |
| Use AI Authoring Assistant | Yes | Yes | Yes | — |
| Submit for review | Yes | Yes | Yes | — |
| Run AI evaluations | Yes | Yes | — | Yes |
| Review and approve subsections | Yes | Yes | — | Yes |
| Formal review decisions | Yes | — | — | Yes |
| Access Regulator Insights | Yes | — | — | Yes |
| Export compiled EIA | Yes | Yes | Yes | Yes |
| Export evaluation reports | Yes | Yes | — | Yes |

### Document-Level Role Matrix

| Capability | Editor | Reviewer | Commenter | Viewer |
|-----------|--------|----------|-----------|--------|
| Edit subsection content | Yes | — | — | — |
| Review and approve | Yes | Yes | — | — |
| Add comments | Yes | Yes | Yes | — |
| View content | Yes | Yes | Yes | Yes |

### Finding Status Definitions

| Status | Meaning |
|--------|---------|
| Compliant | Fully addresses requirements with adequate evidence |
| Partially Compliant | Some requirements addressed; gaps remain |
| Needs Improvement | Content exists but requires significant strengthening |
| Missing | No content or evidence found |
| Needs Review | AI unable to determine; human review required |

### EIA Checklist Sections

| Section | Title | Subsection Count |
|---------|-------|-----------------|
| 1 | Description of the Project | 43 |
| 2 | Consideration of Alternatives | 4 |
| 3 | Description of the Environment Likely to Be Affected | 22 |
| 4 | Description of the Likely Significant Effects | 21 |
| 5 | Description of Mitigation | 6 |
| 6 | Non-Technical Summary | 5 |
| 7 | Regulatory Framework | 5 |
| 8 | Quality of Presentation | 11 |

### Glossary of Terms

| Term | Definition |
|------|-----------|
| **Checklist Mapping** | The link between a subsection and its corresponding compliance criteria from the EIA standard |
| **Document Chunk** | A parsed, page-referenced segment of an uploaded document used as traceable evidence |
| **EIA Document** | The structured Environmental Impact Assessment created and managed within a project |
| **Evaluation Run** | An immutable AI compliance assessment of the EIA against the checklist standard |
| **Finding** | An individual compliance judgement for a specific checklist item within an evaluation run |
| **Organisation** | The top-level tenant account that contains all users, projects, and data |
| **Project** | The container for all documents, EIA assessments, and evaluations related to a single engagement |
| **Source Mapping** | An auto-detected correspondence between content in an uploaded document and a subsection in the EIA |
| **Subsection** | An individual checklist item within an EIA section, containing authored content, evidence, and review status |
| **Tenant** | Synonymous with Organisation; the isolated data boundary for your team |

---

*EnviroQuant™ — Evidence Before Conclusions™*
