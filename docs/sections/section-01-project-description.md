# Section 01 — Project Description (Compliance Definition)

## 1. Purpose

This section evaluates whether the project is clearly and sufficiently described.

The system checks for completeness, clarity, and supporting evidence of:

* Project overview
* Location
* Scale and size
* Activities involved
* Project lifecycle phases

---

## 2. Checklist Items

Each item must be evaluated individually.

### 1. Project Overview

* Is the project clearly described?
* Is the purpose explained?

### 2. Project Location

* Is the location defined?
* Are maps or coordinates provided?

### 3. Project Scale

* Is the size/capacity specified?
* Are quantitative values provided?

### 4. Project Activities

* Are key activities described?
* Are phases (construction, operation, decommissioning) included?

### 5. Project Timeline

* Is timeline provided?
* Are stages defined?

---

## 3. Evaluation Output Schema (STRICT)

Each checklist item must return:

```json
{
  "checklist_item": "string",
  "status": "COMPLIANT | PARTIALLY_COMPLIANT | NON_COMPLIANT",
  "evidence": "string",
  "confidence": 0.0,
  "missing_elements": ["string"],
  "improvement_suggestion": "string"
}
```

---

## 4. Compliance Logic

### COMPLIANT

* All required information is present
* Clear, structured, and supported

### PARTIALLY_COMPLIANT

* Some information present
* Missing key details

### NON_COMPLIANT

* Missing or unclear information

---

## 5. Section Completion Rule

Section status is derived from checklist:

* ≥ 80% compliant → COMPLIANT
* 40% – 79% → PARTIALLY_COMPLIANT
* < 40% → NON_COMPLIANT

---

## 6. Key Design Rules

* No free-text outputs allowed
* All responses must follow schema
* Every finding must include evidence
* No scoring inside LLM
* Deterministic aggregation outside LLM

---

## 7. Future Integration

This section will be used by:

* AI Evaluation Engine
* Compliance Engine
* Report Generator
* Reviewer Dashboard
