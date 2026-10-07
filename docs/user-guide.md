# EnviroQuant User Manual

EnviroQuant supports two connected workflows:

1. **EIA Builder** — create a Kuwait-focused EIA from project information, evidence and professional input.
2. **EIA Quality Review** — upload an existing EIA, assess it against RQEIA requirements, improve weaknesses, and issue a separate Decision Readiness report.

AI assists with organisation, drafting and assessment. An authorised human remains responsible for professional judgement, approval and issue.

## Contents

1. [Access and registration](#1-access-and-registration)
2. [Roles and access](#2-roles-and-access)
3. [Projects and evidence](#3-projects-and-evidence)
4. [Create an EIA](#4-create-an-eia)
5. [Draft, save and improve subsections](#5-draft-save-and-improve-subsections)
6. [Collaboration and controlled review](#6-collaboration-and-controlled-review)
7. [EIA Builder review and export](#7-eia-builder-review-and-export)
8. [EIA Quality Review](#8-eia-quality-review)
9. [Traceability and responsible use of AI](#9-traceability-and-responsible-use-of-ai)
10. [Troubleshooting](#10-troubleshooting)

---

## 1. Access and registration

### Create the first organisation account

Use this only when your organisation does not yet have an EnviroQuant workspace.

1. Open the EnviroQuant web address and select **Register** or **Create Workspace**.
2. Enter the organisation name, your full name, work email and a secure password.
3. Submit the form, then sign in.

The first account becomes the organisation administrator. It can create projects and invite other users.

### Join through an invitation

1. Select **Open EIA Workspace** in the invitation email.
2. On **Accept invitation**, confirm your name and set a password.
3. Accept the invitation and sign in with the invited email and new password.

Do not create a separate organisation account when you have been invited to an existing one. Ask the administrator to resend the invitation if the link has expired.

### Sign in and sign out

Use **Sign In** with your registered email and password. To sign out, open the profile menu in the top right and select **Log out**.

## 2. Roles and access

Permissions are applied at two levels: organisation role and EIA document role/assignment.

| Organisation role | Main responsibility |
|---|---|
| **Admin / Owner** | Manages users, projects, assignments, review and exports. |
| **Project Manager** | Manages project delivery, EIA structure, assignments and review workflow. |
| **Consultant** | Authors assigned subsections and attaches supporting evidence. |
| **Reviewer** | Reviews assigned content, records comments, requests revisions and approves/reopens controlled sections. |
| **Viewer / Regulator** | Read-only access appropriate to the assigned portal. |

Only Admins and Owners can invite users from the organisation **Team** page. Project Managers and Admins assign people to an EIA document, section or subsection.

### Invite a team member

1. Open **Team** in the sidebar.
2. Select **Invite member**.
3. Enter their name and email, select their role, then select **Send Invite**.
4. If email delivery is not configured, copy the generated link and send it securely.

## 3. Projects and evidence

Every EIA and Quality Review belongs to a project. A project keeps its evidence, collaborators and reports together.

### Create a project

1. Open **Projects** and select **Create New Project**.
2. Enter the project name, sector, Kuwait location, description and available project details.
3. Save the project and open the resulting **Project workspace**.

Enter accurate project location and scope first. The platform uses these fields to provide Kuwait-focused regulatory context and organise report content.

### Upload evidence

Use the project workspace upload panel or **Evidence library** in the sidebar.

1. Select **Upload document**.
2. Choose the document and select the best type: baseline study, supporting document, EIA report, previous EIA or legacy report.
3. Wait for upload and parsing to finish.
4. Confirm the filename, version and document type in the project document list.

Evidence can include design information, permits, baseline surveys, specialist studies, consultation records, modelling outputs and previous reports. Uploaded files are parsed into source chunks where possible. The original file and its page/section references remain the evidence source.

## 4. Create an EIA

1. Open the project workspace.
2. In **Structured EIA Documents**, optionally choose an uploaded source document.
3. Leave **Auto-apply parsed sections** enabled only when you want draft mappings from that source.
4. Select **Create structured EIA**.
5. Open the new EIA document.

The Builder uses the Kuwait-oriented master report structure: Executive Summary, Project Description, Regulatory Framework, Alternatives, Environmental and Social Baseline, Impact Assessment, Mitigation and Environmental Management, Monitoring, Cumulative Impacts, Climate/Carbon/Resilience, Consultation, Compliance Matrix, Environmental Intelligence and QA, Conclusions/Decision Readiness, and Appendices/Evidence Register.

Creating a structured EIA does not prove compliance. It creates controlled places where the team develops and verifies the evidence-led assessment.

## 5. Draft, save and improve subsections

### Work with the section navigator

The left **EIA sections** panel shows the document structure. Select a section, then a subsection. The title above the editor and the response must match the selected subsection.

When moving between items, EnviroQuant shows **Loading subsection response** rather than presenting prior content. If wrong content remains after loading, refresh and report the EIA title and subsection number.

### Write and save

1. Select a subsection assigned to you.
2. Confirm it is **In progress**. If it is **Assigned**, select **Start work**.
3. Write or edit the response in the rich-text editor.
4. Add headings, lists, tables and images where useful.
5. Select **Save draft** and wait for the saved confirmation.

The editor content is the source for the final compiled EIA. Save content before leaving a subsection.

### Add subsection evidence

Use the attachments/evidence area to upload source material supporting a specific claim. Keep the source document, page, study date and limitation clear enough for a reviewer to verify it.

### Use AI drafting assistance

**AI draft assistant in the EIA Builder**

1. Open a section and select **Generate drafts**.
2. Review the proposed content for each subsection.
3. Select **Save AI draft** for the required item.
4. EnviroQuant saves the proposal to that exact subsection and changes it to **In progress** when appropriate.
5. Reopen the subsection and edit the text as needed.

**AI assistance in a subsection workspace**

Use **Outline**, **Evidence Gaps**, **Generate draft** or **Improve draft**. Review the proposal, apply it to the editor, then select **Save draft**. Applying a proposal changes the editor; saving creates the controlled revision.

AI output is a draft. Check facts, quantities, authority names, legal references and specialist conclusions against the evidence before issue.

### Approved content

An **Approved** subsection is intentionally locked to protect the controlled issue. It cannot be overwritten by an AI draft.

An authorised reviewer or workflow manager can reopen it:

1. Open the approved subsection.
2. Enter a reason in **Reason for reopening this approved subsection**.
3. Select **Reopen for revision**.
4. The status becomes **Revision required**.
5. The assigned author selects **Start revision**, saves the change, then submits it for review again.

## 6. Collaboration and controlled review

### Assign work

Project Managers and Admins use **Assignments** in the EIA workspace to assign authors and reviewers. A section assignment is inherited by its subsections unless a subsection assignment overrides it.

Authors and reviewers normally see only assigned subsections. Managers see the full EIA to coordinate delivery.

### Add document collaborators

Open the EIA **Team** area to add existing organisation users as Editors, Reviewers, Commenters or Viewers for that document.

### Workflow states

| Status | Normal next action |
|---|---|
| Not started | Assign an author and reviewer. |
| Assigned | Author selects **Start work**. |
| In progress | Author saves content and selects **Submit for review**. |
| Ready for review | Reviewer selects **Start review**. |
| Under review | Reviewer approves or requests revisions with a comment. |
| Revision required | Author selects **Start revision**. |
| Approved | Locked content; reviewer/manager may reopen it with a recorded reason. |

Use comments for questions, evidence requests and decisions. Resolve comments before approval. Each save and workflow change contributes to the audit trail and revision history.

## 7. EIA Builder review and export

### Run an EIA review

Open the EIA’s **Review Center** and start an evaluation run after relevant draft content and evidence are saved. The review produces findings with evidence summaries, assessments, gaps and recommended actions.

Use the results to work through this loop:

```text
Requirement → Evidence → Assessment → Finding → Recommended action
                                      ↓
                           Improve → re-analyse → close or retain finding
```

Do not treat a high score as automatic approval. Review evidence links, assumptions and limitations, then record the authorised reviewer decision.

### Generate the final EIA report

Use **Prepare and share your report** in the EIA Builder.

- **Download Word (.docx)** produces an editable professional report.
- **Controlled PDF (.pdf)** produces the corresponding controlled issue format.
- **Email report** sends the selected export format when email delivery is configured.

Exports use current saved EIA content. Save drafts and complete review decisions before downloading. The final authorised reviewer remains responsible for approval and distribution.

## 8. EIA Quality Review

Quality Review is not an EIA Builder draft. It is a standalone assessment of an existing, uploaded EIA.

### Start a Quality Review

1. Open **EIA Quality Review** in the sidebar.
2. Select the project that will contain the review.
3. Upload the existing EIA as a PDF or Word file, choosing an EIA/previous EIA/legacy report type where prompted.
4. EnviroQuant creates a separate **RQEIA Quality Review** workspace for that file.
5. Open the review workspace and run the AI review.

You can also select **Start review** beside an existing uploaded EIA in the Quality Review module.

### Read the review

The review assesses detailed RQEIA requirements rather than producing only general scores. For each finding, review:

- Requirement or review question
- Evidence and source/page reference where available
- Assessment and confidence
- Finding status and priority
- Gap or missing information
- Recommended action
- Reviewer decision: retain or close, with a recorded reason

The system can identify a weakness, but it must not invent surveys, monitoring data, modelling results or environmental evidence that has not been provided.

### Improve with AI and re-analyse

1. Open the finding and read the evidence summary, analysis and recommendation.
2. Select **Improve with AI** where available.
3. Review and save the proposed improvement in the linked draft.
4. Run a new review.
5. Compare the new result and record a reviewer decision to **Close finding** or **Retain finding**.

If improvement requires field survey, specialist study, modelling, regulator confirmation or monitoring data, record that as a required action. Do not use AI wording as a substitute for missing evidence.

### Export the Quality Review report

Export the professional **EIA Quality Review & Decision Readiness Report** as editable **Word (.docx)** or controlled **PDF (.pdf)**. It includes the selected review run’s summary, RQEIA findings, priorities, evidence-linked recommendations and recorded reviewer decisions.

## 9. Traceability and responsible use of AI

Maintain this chain whenever possible:

```text
Requirement → Evidence → Source → Assessment → Finding → Gap → Recommendation → Reviewer decision
```

Good practice:

- Attach or cite the source that supports a material statement.
- State uncertainty, assumptions and evidence gaps clearly.
- Keep regulations and standards specific to Kuwait and the actual project location.
- Verify AI-generated text before saving or issuing it.
- Use revision history and reviewer comments to explain why a finding was closed, retained or reopened.

## 10. Troubleshooting

| Problem | What to do |
|---|---|
| Invitation opens sign-in instead of password setup | Use the invitation link itself, not the generic workspace link. Ask an Admin to resend it if needed. |
| Cannot see an assigned section | Refresh; authors/reviewers see only assigned work. Ask a manager to check assignment and document membership. |
| “Assign a reviewer before submitting” | A reviewer must be assigned at subsection or inherited section level before submission. |
| “Approved and locked” | This is deliberate. An authorised reviewer/manager must reopen it with a reason before editing. |
| AI draft disappears after refresh | Use **Save AI draft** or **Save draft** and wait for confirmation. |
| Content does not match the selected subsection | Wait for **Loading subsection response**, then refresh. Report the EIA title and subsection number if it persists. |
| Upload fails | Check Cloudinary credentials and backend deployment logs. Confirm the file type and size are supported. |
| AI unavailable | The platform may show evidence/checklist guidance. Check `OPENAI_API_KEY`, model configuration and backend logs. |
| Export fails | Confirm EIA content is saved, then retry. Check backend logs and storage configuration if it continues. |
| CORS or “Failed to fetch” in production | Confirm `NEXT_PUBLIC_API_URL` points to the deployed FastAPI backend and `ALLOWED_ORIGINS` includes the production frontend domain. |

---

**Professional responsibility:** EnviroQuant supports structured analysis and drafting. It does not replace the judgement, sign-off or legal responsibility of the authorised environmental professional.
