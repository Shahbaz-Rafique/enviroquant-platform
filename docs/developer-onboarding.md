# EnviroQuant Developer Onboarding

# 1. Purpose

This document defines the development philosophy, architecture expectations, and implementation boundaries for the EnviroQuant MVP.

All developers working on the platform must follow these principles.

---

# 2. Platform Mission

EnviroQuant is being developed as:

- an Environmental Intelligence Platform
- an EIA compliance evaluation system
- a structured AI reasoning platform
- a future SaaS + Data-as-a-Service (DaaS) system

The platform is NOT:
- a chatbot
- a generic AI wrapper
- an uncontrolled document generator

---

# 3. Core MVP Goal

The first goal is:

```text id="4f47fx"
Document
 → Structured Evaluation
   → Traceable Findings
     → Reliable Compliance Classification
The MVP must prove:

deterministic workflows
traceable outputs
schema-controlled AI
reliable evaluation pipeline
4. Development Priorities

Development order:

1. System architecture
2. Compliance engine
3. AI evaluation workflow
4. Traceability system
5. Backend infrastructure
6. Frontend UX
7. SaaS scaling

Do NOT prioritize:

visual polish
advanced UI
complex dashboards
before the core engine works correctly.
5. Architecture Philosophy

The platform should initially be built as:

modular monolith
clean service boundaries
async-ready pipeline
version-controlled evaluation system

Avoid premature microservices.

6. AI System Rules

The AI system must:

remain schema-controlled
avoid hallucinations
provide evidence references
support reproducibility

AI outputs must:

follow strict JSON schema
include evidence references
remain traceable

The AI must NOT:

generate uncontrolled conclusions
perform deterministic scoring
replace compliance logic
7. Deterministic Logic

Compliance classification and scoring logic must remain outside the LLM.

All critical logic must be:

rule-based
auditable
reproducible
8. Traceability Requirements

Every finding must trace back to:

Document
 → Section
   → Chunk
     → Finding

Each finding must include:

chunk reference
section reference
evidence source
page location
9. Versioning Requirements

The system must version:

documents
checklist definitions
prompts
evaluation runs
scoring logic

Historical runs must remain immutable.

10. Frontend Philosophy

Frontend should remain:

simple
clean
functional
workflow-focused

Do NOT overbuild UI early.

Priority:

usability
traceability
review workflows
11. MVP Scope Boundaries

The MVP should include:

project creation
file upload
parsing pipeline
chunking
checklist evaluation
findings generation
compliance classification
evidence viewer

The MVP should NOT initially include:

advanced collaboration
benchmarking
analytics dashboards
large-scale SaaS features
DaaS intelligence systems
12. Developer Expectations

Developers are expected to:

think in systems
challenge weak architecture
maintain clean boundaries
prioritize reproducibility
build incrementally

The platform foundation must remain scalable.

13. Ownership & Repository Rules
All code must remain inside EnviroQuant-owned repositories
Founder retains platform ownership
Changes should remain documented
Architecture decisions should remain traceable
14. Communication Philosophy

Development should remain:

transparent
documented
milestone-driven
architecture-focused

Important decisions should be documented before implementation.

15. Long-Term Direction

After MVP validation, the platform is expected to evolve into:

full SaaS platform
regulator review system
environmental intelligence engine
benchmarking platform
Data-as-a-Service (DaaS) layer

The MVP foundation must support future scaling.

16. Final Principle

The platform must prioritize:

Reliability
 → Traceability
   → Reproducibility
     → Environmental Decision Support

before visual polish or advanced automation.
