# EnviroQuant AI Evaluation Engine

# 1. Purpose

The AI Evaluation Engine is responsible for performing structured environmental compliance evaluation on EIA documents.

The system must:
- remain deterministic
- remain traceable
- remain schema-controlled
- avoid uncontrolled AI behavior

The AI is used only as a structured reasoning layer.

---

# 2. Core AI Principle

The AI must never:
- invent evidence
- generate unsupported conclusions
- produce uncontrolled free text

Every output must:
- reference source evidence
- follow schema
- remain reproducible

---

# 3. AI Evaluation Workflow

```text
Document
    ↓
Structured Parsing
    ↓
Chunk Creation
    ↓
Checklist Mapping
    ↓
AI Evaluation
    ↓
Validation Layer
    ↓
Compliance Classification
    ↓
Store Findings

 4. AI Responsibilities

The AI system is responsible for:

extracting environmental evidence
identifying missing information
evaluating adequacy of explanations
detecting weak or incomplete sections
generating structured findings

The AI is NOT responsible for:

deterministic scoring
final rule-based logic
uncontrolled conclusions
5. AI Input Structure

Each evaluation request contains:

checklist item
evaluation instructions
document chunk(s)
evidence references
section metadata

Example:

{
  "checklist_item": "Project objectives clearly described",
  "section": "Project Description",
  "chunks": [
    {
      "chunk_id": "chunk_001",
      "content": "..."
    }
  ]
}
6. AI Output Structure (STRICT)

The AI must always return structured JSON.

{
  "checklist_item": "string",
  "status": "COMPLIANT | PARTIALLY_COMPLIANT | NON_COMPLIANT",
  "evidence_summary": "string",
  "evidence_refs": ["chunk_id"],
  "missing_elements": ["string"],
  "improvement_suggestion": "string",
  "confidence": 0.0
}

No free-text outputs allowed outside schema.

7. Validation Layer

Every AI response must pass validation checks.

Checks include:

schema correctness
required fields
valid evidence references
valid status values

Invalid outputs:

rejected
retried automatically
8. Deterministic Compliance Logic

The final compliance result is generated outside the LLM.

Logic includes:

mandatory item checks
section thresholds
critical requirement validation

The AI assists evaluation only.

9. Traceability Requirements

Every finding must trace back to:

Document
 → Section
   → Chunk
     → Finding

Each finding stores:

chunk_id
section_id
page_number
evidence text
confidence value
10. Versioning Requirements

Each evaluation run stores:

document_version
checklist_version
prompt_version
evaluation_model_version

Historical runs must remain reproducible.

11. AI Prompt Design

Prompts must:

remain narrow and controlled
focus on one checklist item at a time
avoid broad reasoning
avoid creative generation

Prompt goals:

structured extraction
evidence evaluation
missing information detection
12. Multi-Evidence Evaluation

The system supports:

multiple evidence chunks
multiple supporting references
partial evidence detection

The AI must evaluate:

evidence strength
completeness
adequacy
13. Confidence Handling

Confidence is informational only.

Confidence does NOT determine:

compliance classification
scoring

Compliance remains rule-driven.

14. Human Review Support

The system must support human review.

Users must be able to:

inspect evidence
review findings
validate outputs
compare runs
15. Future AI Expansion

Future phases may include:

benchmark intelligence
cross-project comparison
regulator analytics
environmental knowledge graph
adaptive checklist intelligence
16. MVP Objective

Deliver a reliable AI evaluation pipeline capable of:

evaluating EIA sections
identifying compliance gaps
generating traceable findings
supporting environmental review workflows
maintaining deterministic and auditable outputs

