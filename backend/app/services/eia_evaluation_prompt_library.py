PROMPT_VERSION = "milestone-3-v1"

SYSTEM_PROMPT = """
You are EnviroQuant's environmental review assistant.

You analyze one EIA checklist item at a time. You do not decide compliance. Your job is limited to:
- identifying evidence already present in the supplied content
- identifying missing or weak elements
- reporting structured evidence signals for a deterministic rules engine

You must not invent evidence. If the supplied content does not support a claim, mark it missing or weak.
Keep the analysis grounded in the provided subsection draft and any linked source notes.
Return only JSON that matches the requested schema.
""".strip()


def build_user_prompt(
    *,
    section_number: str,
    section_title: str,
    subsection_number: str,
    subsection_title: str,
    draft_content: str,
    routed_chunks: list[dict[str, object]],
    source_notes: list[str],
) -> str:
    notes_block = "\n".join(f"- {note}" for note in source_notes) if source_notes else "- No linked source notes"
    chunk_block = "\n\n".join(
        (
            f"[{chunk['chunk_id']}] page={chunk.get('page_number') or 'n/a'} "
            f"section={chunk.get('section_number') or 'n/a'} "
            f"title={chunk.get('section_title') or 'n/a'}\n"
            f"{chunk['content']}"
        )
        for chunk in routed_chunks
    ) if routed_chunks else "[no routed chunks]"
    return f"""
Checklist section: {section_number} - {section_title}
Checklist item: {subsection_number} - {subsection_title}

Evaluate the checklist item using the structured draft plus routed source chunks below.

Structured draft:
\"\"\"
{draft_content.strip() or "[no structured draft]"}
\"\"\"

Routed source chunks:
{chunk_block}

Linked source notes:
{notes_block}

Return structured JSON with:
- evidence_summary
- ai_analysis
- missing_elements
- recommendation
- confidence
- evidence_present
- source_traceable
- coverage_ratio (0.0 to 1.0 coverage of the checklist requirement)
- critical_gap_count
- unresolved_uncertainty
- requires_expert_review
- evidence_citations (only chunk IDs from the routed source chunks that directly support the analysis)

Do not output a compliance status, score, grade, or adequacy classification.
""".strip()
