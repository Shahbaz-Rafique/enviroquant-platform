from sqlalchemy.orm import Session

from app.models.checklist_mapping import ChecklistMapping
from app.models.eia import EiaDocument, EiaSection, EiaSubSection


EIA_STRUCTURE = {
    "1": {
        "title": "DESCRIPTION OF THE PROJECT",
        "subsections": [
            {"number": "1.1", "title": "The Objectives and Physical Characteristics of the Project"},
            {"number": "1.1.1", "title": "Are the need and objectives of the project explained?"},
            {
                "number": "1.1.2",
                "title": (
                    "Is the programme for implementation of the Project described, detailing the "
                    "estimated length of time and start and finish dates for construction, "
                    "operation and Commissioning?"
                ),
            },
            {"number": "1.1.3", "title": "Are all of the main components of the project described?"},
            {
                "number": "1.1.4",
                "title": (
                    "Is the location of each Project component identified, using maps, plans and "
                    "diagrams as necessary?"
                ),
            },
            {"number": "1.1.5", "title": "Is the layout of the site (or sites) occupied by the project described?"},
            {
                "number": "1.1.6",
                "title": "For projects involving tunneling and earthworks, are these activities properly described?",
            },
            {"number": "1.1.7", "title": "Are the activities involved in construction of the project all described?"},
            {"number": "1.1.8", "title": "Are the activities involved in operation of the project all described?"},
            {"number": "1.1.10", "title": "Are additional services required for the project described?"},
            {
                "number": "1.1.11",
                "title": "Are any developments likely to occur as a consequence of the Project identified?",
            },
            {
                "number": "1.1.12",
                "title": "Are existing activities which will alter or cease as a consequence of the Project identified?",
            },
            {
                "number": "1.1.13",
                "title": (
                    "Are there other existing or planned developments with which the Project could "
                    "have cumulative effects identified?"
                ),
            },
            {"number": "1.2", "title": "The Size of the Project"},
            {
                "number": "1.2.1",
                "title": (
                    "Is the area of land occupied by each of the permanent project components "
                    "quantified and shown on a scaled map?"
                ),
            },
            {"number": "1.3", "title": "The Size of the Project (Continued)"},
            {
                "number": "1.3.1",
                "title": "Is the area of land required temporarily for construction quantified and mapped?",
            },
            {
                "number": "1.3.2",
                "title": (
                    "Is the restoration and after use of land occupied temporarily for operation "
                    "of the Project described?"
                ),
            },
            {
                "number": "1.3.4",
                "title": "Is the size of structures or other works developed as part of the Project identified?",
            },
            {
                "number": "1.3.5",
                "title": "Is the form and appearance of structures or other works developed as part of the Project described?",
            },
            {
                "number": "1.3.6",
                "title": (
                    "For urban or similar development projects, are the numbers and other "
                    "characteristics of new populations or business communities described?"
                ),
            },
            {
                "number": "1.3.7",
                "title": (
                    "For projects involving the displacement of people or businesses, are the "
                    "numbers and other characteristics of those displaced described?"
                ),
            },
            {
                "number": "1.3.8",
                "title": (
                    "For new transport infrastructure or projects generating substantial traffic "
                    "flows, is the type, volume, temporal pattern and geographical distribution "
                    "of new traffic generated or diverted described?"
                ),
            },
            {"number": "1.4", "title": "Production Processes and Resources Used"},
            {"number": "1.4.1", "title": "Are all the processes involved in operating the Project described?"},
            {"number": "1.4.2", "title": "Are the types and quantities of outputs produced by the Project described?"},
            {
                "number": "1.4.3",
                "title": "Are the types and quantities of raw materials and energy needed for construction and operation discussed?",
            },
            {
                "number": "1.4.4",
                "title": "Are the environmental implications of the sourcing of raw materials discussed?",
            },
            {"number": "1.4.5", "title": "Is efficiency in use of energy and raw materials discussed?"},
            {"number": "1.5", "title": "Production Processes and Resources Used (Continued)"},
            {
                "number": "1.5.1",
                "title": "Are hazardous materials used, stored, handled or produced by the Project identified and quantified?",
            },
            {
                "number": "1.5.2",
                "title": (
                    "Is the transport of raw materials to the Project and the number of traffic "
                    "movements involved discussed?"
                ),
            },
            {"number": "1.5.3", "title": "Is employment created or lost as a result of the Project discussed?"},
            {
                "number": "1.5.4",
                "title": (
                    "Are the access arrangements and the number of traffic movements involved in "
                    "bringing workers and visitors estimated?"
                ),
            },
            {
                "number": "1.5.5",
                "title": "Is the housing and provision of services for any temporary or permanent employees discussed?",
            },
            {"number": "1.5.6", "title": "Are the types and quantities of solid waste generated by the Project identified?"},
            {"number": "1.6", "title": "Residues and Emissions"},
            {"number": "1.6.1", "title": "Is the composition and toxicity or other hazards of all solid wastes produced discussed?"},
            {
                "number": "1.6.2",
                "title": (
                    "Are the methods for collecting, storing, treating, transporting and finally "
                    "disposing of these solid wastes described?"
                ),
            },
            {"number": "1.6.4", "title": "Are the types and quantities of liquid effluents generated identified?"},
            {
                "number": "1.6.8",
                "title": "Are the types and quantities of gaseous and particulate emissions generated identified?",
            },
            {
                "number": "1.6.13",
                "title": "Are any sources of noise, heat, light or electromagnetic radiation identified and quantified?",
            },
            {
                "number": "1.6.14",
                "title": (
                    "Are the methods for estimating the quantities and composition of all residues "
                    "and emissions identified?"
                ),
            },
            {"number": "1.7", "title": "Risk of Accidents and Hazards"},
            {"number": "1.7.1", "title": "Are any risks associated with the Project discussed?"},
            {
                "number": "1.7.2",
                "title": "Are measures to prevent and respond to accidents and abnormal events described?",
            },
        ],
    },
    "2": {
        "title": "CONSIDERATION OF ALTERNATIVES",
        "subsections": [
            {
                "number": "2.1",
                "title": (
                    "Is the process by which the Project will be developed described, and are "
                    "alternatives considered during this process?"
                ),
            },
            {"number": "2.2", "title": "Are the alternatives realistic and genuine alternatives to the Project?"},
            {
                "number": "2.3",
                "title": (
                    "Are the main reasons for choice of the proposed Project explained, "
                    "including any environmental reasons?"
                ),
            },
            {
                "number": "2.4",
                "title": (
                    "Are the main environmental effects of the alternatives compared with those "
                    "of the proposed Project?"
                ),
            },
        ],
    },
    "3": {
        "title": "DESCRIPTION OF ENVIRONMENT LIKELY TO BE AFFECTED BY THE PROJECT",
        "subsections": [
            {"number": "3.1", "title": "Aspects of the Environment"},
            {"number": "3.1.1", "title": "Are the existing land uses and people living on or using the land identified?"},
            {"number": "3.1.2", "title": "Are the topography, geology and soils described?"},
            {"number": "3.1.4", "title": "Are the fauna and flora and habitats described and illustrated on maps?"},
            {"number": "3.1.6", "title": "Is the water environment of the area described?"},
            {
                "number": "3.1.8",
                "title": "Are local climatic and meteorological conditions and existing air quality described?",
            },
            {
                "number": "3.2.1",
                "title": (
                    "Are any locations or features of archaeological, historic, architectural or "
                    "cultural importance described?"
                ),
            },
            {"number": "3.2.2", "title": "Are demographic, social and socio-economic conditions described?"},
            {"number": "3.3.1", "title": "Has the study area been defined widely enough?"},
        ],
    },
    "4": {
        "title": "DESCRIPTION OF THE LIKELY SIGNIFICANT EFFECTS OF THE PROJECT",
        "subsections": [
            {"number": "4.1", "title": "Scoping of Effects"},
            {"number": "4.2", "title": "Prediction of Direct Effects"},
            {"number": "4.4", "title": "Prediction of Secondary, Temporary, Permanent, Indirect, Cumulative Effects"},
            {"number": "4.5", "title": "Prediction of Effects on Human Health and Sustainable Development Issues"},
            {"number": "4.6", "title": "Evaluation of the Significance of Effects"},
            {"number": "4.7", "title": "Impact Assessment Methods"},
        ],
    },
    "5": {
        "title": "DESCRIPTION OF MITIGATION",
        "subsections": [
            {
                "number": "5.1",
                "title": "Where there are significant adverse effects, is the potential for mitigation discussed?",
            },
            {"number": "5.4", "title": "Are reasons for choosing the proposed mitigation explained?"},
            {
                "number": "5.5",
                "title": "Is it evident that a full range of possible approaches to mitigation is considered?",
            },
            {
                "number": "5.6",
                "title": "Are there arrangements proposed to monitor and manage residual impacts?",
            },
        ],
    },
    "6": {
        "title": "NON-TECHNICAL SUMMARY",
        "subsections": [
            {"number": "6.1", "title": "Does the EIA include a Non-Technical Summary?"},
            {
                "number": "6.2",
                "title": (
                    "Does the Summary provide a concise but comprehensive description of the "
                    "Project, its environment, effects and mitigation?"
                ),
            },
            {"number": "6.5", "title": "Is the Summary written in non-technical language?"},
        ],
    },
    "7": {
        "title": "REGULATORY FRAMEWORK",
        "subsections": [
            {
                "number": "7.1",
                "title": "Are relevant & applicable Regulations in State of Kuwait (KEPA, Ministry of Oil etc.) provided?",
            },
            {"number": "7.2", "title": "Are applicable Environmental Standards discussed?"},
            {"number": "7.3", "title": "Are KOC HSE MS Policy, Vision & Mission clearly described?"},
            {"number": "7.4", "title": "Are applicable features of KOC EIA Procedure implemented?"},
        ],
    },
    "8": {
        "title": "QUALITY OF PRESENTATION",
        "subsections": [
            {
                "number": "8.1",
                "title": "Is the Environmental Information available in one or more clearly defined documents?",
            },
            {"number": "8.2", "title": "Is the document(s) logically organized and clearly structured?"},
            {"number": "8.3", "title": "Is there a table of contents at the beginning of the document(s)?"},
            {
                "number": "8.6",
                "title": (
                    "Does the presentation make effective use of tables, figures, maps, "
                    "photographs and other graphics?"
                ),
            },
            {
                "number": "8.11",
                "title": "Is the presentation demonstrably fair and as far as possible impartial and objective?",
            },
        ],
    },
}


def seed_eia_structure(db: Session, document: EiaDocument) -> None:
    """Seed the standard 8-section EIA checklist structure for one document."""
    subsection_order = 1
    for section_order, (section_number, section_data) in enumerate(EIA_STRUCTURE.items(), start=1):
        section = EiaSection(
            tenant_id=document.tenant_id,
            eia_document_id=document.id,
            section_number=section_number,
            title=section_data["title"],
            display_order=section_order,
        )
        db.add(section)
        db.flush()

        for subsection in section_data["subsections"]:
            eia_subsection = EiaSubSection(
                tenant_id=document.tenant_id,
                eia_document_id=document.id,
                section_id=section.id,
                subsection_number=subsection["number"],
                title=subsection["title"],
                completion_status="NOT_STARTED",
                progress_percentage=0.0,
                display_order=subsection_order,
            )
            db.add(eia_subsection)
            db.flush()
            db.add(
                ChecklistMapping(
                    tenant_id=document.tenant_id,
                    subsection_id=eia_subsection.id,
                    checklist_section=subsection["number"],
                    checklist_title=subsection["title"],
                    importance=_importance_for_checklist_item(subsection["number"]),
                )
            )
            subsection_order += 1

    db.flush()


def _importance_for_checklist_item(checklist_section: str) -> str:
    if checklist_section.count(".") >= 2:
        return "HIGH"
    return "MEDIUM"
