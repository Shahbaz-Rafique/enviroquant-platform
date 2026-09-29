# EIA writing and sharing workflow

Research checked 25 September 2026.

## Evidence used

- [World Bank ESS1 guidance, Annex 1](https://thedocs.worldbank.org/en/doc/4bd5a5a506fdc47ec012691d7374c0c9-0290012025/original/ESS1-Assessment-and-Management-of-Environmental-and-Social-Risks-and-Impacts-English.pdf): a useful outline for project description, baseline, impact assessment, alternatives and mitigation. It is lender guidance, not a substitute for jurisdiction-specific requirements.
- [IFC Performance Standards](https://www.ifc.org/en/insights-reports/2012/ifc-performance-standards): a reference for risk assessment and management. The framework is undergoing an update; the application identifies its reference rather than asserting universal legal applicability.
- [Nielsen Norman Group: Progressive disclosure](https://www.nngroup.com/articles/progressive-disclosure/): keep frequent tasks visible and reveal secondary tools when requested.
- [Nielsen Norman Group: Complex applications](https://www.nngroup.com/articles/complex-application-design/): organize controls around users' tasks and provide context for unfamiliar work.

## Product decisions

1. Start with the section list instead of a management dashboard.
2. Keep Word download and email visible at document level.
3. Add a consistent “What should I add?” action for each section and in the editor.
4. Show suggestions separately from editable report content. Suggestions do not change compliance status or overwrite work.
5. Use saved drafts and subsection checklists for contextual suggestions. Label checklist fallback explicitly if AI is absent or unavailable.
6. Present general guidance sources and remind authors to confirm local applicability. A jurisdiction was not specified for this change. No automatic country-specific legal verification is performed.
7. Collapse advanced drafting/evidence controls in the focused subsection workspace. Preserve admin-only member management.
8. Download and email the same DOCX renderer, retaining headings, lists, emphasis and tables. Source images are represented by captions/URLs, not embedded binaries.
9. Email requires an explicit recipient and Send action. The backend validates access and reports SMTP failures. Automated checks mock delivery and do not send real emails.

## Verification

Backend regression tests cover advisory behavior, document access, DOCX formatting, email attachment construction and error responses. Browser checks cover desktop/mobile navigation, suggestion rendering, email form, and real DOCX download. Email delivery and AI output are intercepted in browser checks to avoid external messages and nondeterministic results.
