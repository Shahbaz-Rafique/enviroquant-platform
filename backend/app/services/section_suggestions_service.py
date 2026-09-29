"""Advisory section guidance; never writes draft content or compliance decisions."""
import json
import re
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models.user import User
from app.services.eia_service import get_eia_document_for_tenant

SOURCES = [
    {"title": "World Bank ESS1 — ESIA outline, Annex 1", "url": "https://thedocs.worldbank.org/en/doc/4bd5a5a506fdc47ec012691d7374c0c9-0290012025/original/ESS1-Assessment-and-Management-of-Environmental-and-Social-Risks-and-Impacts-English.pdf"},
    {"title": "IFC Performance Standard 1", "url": "https://www.ifc.org/en/insights-reports/2012/ifc-performance-standards"},
]
# Paraphrased drafting prompts, not a claim that lender standards apply to every project.
TOPICS = [
    (("description", "project", "purpose"), ["Describe location, scale, phases, associated facilities and resource needs.", "Explain project objectives and include a site map and surrounding sensitive receptors."]),
    (("baseline", "environment", "existing"), ["Describe environmental and social baseline conditions using dated, location-specific data.", "Identify sensitive receptors, seasonal variation and limitations in the available data."]),
    (("impact", "assessment", "prediction"), ["Explain assessment methods and the significance of direct, indirect and cumulative effects.", "Describe affected receptors, duration, likelihood and uncertainty for each material impact."]),
    (("alternative",), ["Compare feasible site, technology and design alternatives, including the no-project option.", "Explain why the preferred option was selected using environmental and social criteria."]),
    (("mitigation", "management", "monitor"), ["Set out measures to avoid, minimize and address remaining impacts.", "Assign responsibilities, budgets, monitoring indicators, frequency and corrective actions."]),
    (("consult", "stakeholder", "participation"), ["Summarize consultation, concerns raised and how the project responded.", "Explain ongoing engagement and accessible grievance arrangements."]),
    (("legal", "policy", "regulat"), ["Identify applicable national requirements, permits and relevant lender commitments.", "Record the source and version of each requirement and explain any gaps."]),
    (("summary",), ["Summarize significant findings, alternatives, remaining impacts and recommended actions in plain language."]),
]


def section_expectations(title: str) -> list[str]:
    points = [point for words, items in TOPICS if any(word in title.lower() for word in words) for point in items]
    return list(dict.fromkeys(points))[:6] or ["Explain this section's findings and methods, supported by dated sources.", "Identify uncertainties, missing evidence and actions needed before review."]


def generate_section_suggestions(db: Session, user: User, document_id: UUID, section_id: UUID) -> dict:
    document = get_eia_document_for_tenant(db, user, document_id)
    section = next((item for item in document.sections if item.id == section_id), None)
    if section is None:
        raise HTTPException(404, "Section not found in this EIA document")
    expectations = section_expectations(section.title)
    items = []
    for sub in section.subsections:
        text = re.sub(r"<[^>]+>", " ", sub.content_html or sub.content or "").strip()
        checks = [m.checklist_title for m in sub.checklist_mappings]
        points = (["Add a draft response for this subsection."] if not text else [])
        points += [f"Address the checklist question: {title}" for title in checks[:4]]
        if not sub.attachments and not sub.source_mappings:
            points.append("Add or link supporting evidence and cite relevant pages or tables.")
        items.append({"subsection_id": str(sub.id), "title": f"{sub.subsection_number} {sub.title}", "suggestions": points or ["Check that claims, methods and uncertainties are supported by cited evidence."], "draft": text[:3500]})
    result = {"engine": "checklist", "summary": "Checklist guidance based on saved content. Confirm local requirements before submission.", "expectations": expectations, "sources": SOURCES, "subsections": items}
    settings = get_settings()
    if settings.openai_api_key:
        try:
            from openai import OpenAI
            client = OpenAI(api_key=settings.openai_api_key, timeout=settings.openai_evaluation_timeout_seconds)
            system_prompt = (
                "You are an expert EIA (Environmental Impact Assessment) author. "
                "For each subsection provided, write a professional draft response that directly answers the checklist question. "
                "Use formal EIA report language. Where the user has existing draft text, expand and improve it. "
                "Where there is no draft, write a complete starting draft based on the section context. "
                "Use placeholder brackets like [INSERT VALUE] for specific data, measurements or site-specific facts that the author must verify. "
                "Do not invent real measurements, legal thresholds or citations. "
                "Return JSON: {\"summary\": string, \"subsections\": [{\"subsection_id\": string, \"draft_html\": string, \"suggestions\": [string]}]}. "
                "draft_html must be valid HTML using <p>, <ul>, <li>, <strong> tags only. "
                "suggestions are 2-3 specific things the author should add or verify."
            )
            response = client.chat.completions.create(
                model=settings.openai_evaluation_model, temperature=0.3,
                response_format={"type": "json_object"},
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": json.dumps({
                        "section": section.title,
                        "expectations": expectations,
                        "subsections": items
                    })}
                ],
            )
            output = json.loads(response.choices[0].message.content or '{}')
            sub_outputs = {item['subsection_id']: item for item in output.get('subsections', [])}
            for item in items:
                sub_out = sub_outputs.get(item['subsection_id'])
                if not sub_out:
                    raise ValueError('Incomplete AI response')
                if sub_out.get('draft_html'):
                    item['draft_html'] = str(sub_out['draft_html'])
                points = sub_out.get('suggestions', [])
                if isinstance(points, list) and points:
                    item['suggestions'] = [str(p).strip() for p in points[:3] if str(p).strip()]
            result['engine'] = 'ai'
            result['summary'] = str(output.get('summary') or 'AI-generated drafts ready to review and insert.')[:2000]
        except Exception as exc:
            status_code = getattr(exc, "status_code", None)
            if status_code == 401:
                reason = "AI authentication failed. Ask your administrator to replace the OpenAI API key and restart the backend."
            elif status_code == 429:
                reason = "AI usage or rate limit reached. Ask your administrator to check API usage and billing, then retry."
            elif isinstance(exc, TimeoutError) or type(exc).__name__ == "APITimeoutError":
                reason = "The AI request timed out. Please retry."
            elif isinstance(exc, (ValueError, KeyError, TypeError)):
                reason = "The AI response was incomplete. Please retry."
            else:
                reason = "The AI request failed. Please retry or contact your administrator."
            result['summary'] = reason + " Showing checklist guidance; your draft has not been changed."
    for item in items:
        item.pop('draft', None)
    return result
