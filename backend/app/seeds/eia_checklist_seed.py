from sqlalchemy.orm import Session

from app.models.checklist_mapping import ChecklistMapping
from app.models.eia import EiaDocument, EiaSection, EiaSubSection


# The RQEIA question set is a review methodology. It must remain independent
# from the authoring/report structure used by the EIA Builder.
RQEIA_REVIEW_STRUCTURE = {
    "1": {
        "title": "DESCRIPTION OF THE PROJECT",
        "subsections": [
            {"number": "1.1.1", "title": "Are the need and objectives of the project explained?"},
            {
                "number": "1.1.2",
                "title": (
                    "Is the programme for implementation described (timeline, start/finish dates for construction, "
                    "operation, commissioning, including phases)?"
                ),
            },
            {"number": "1.1.3", "title": "Are all main components of the project described?"},
            {"number": "1.1.4", "title": "Is the location of each project component identified (maps, plans, diagrams)?"},
            {
                "number": "1.1.5",
                "title": (
                    "Is the layout of the site(s) described (ground levels, buildings, structures, underground works, "
                    "storage, water features, planting, access, boundaries)?"
                ),
            },
            {"number": "1.1.6", "title": "For tunneling and earthworks - are activities properly described?"},
            {"number": "1.1.7", "title": "Are all construction activities described?"},
            {"number": "1.1.8", "title": "Are all operation activities described?"},
            {
                "number": "1.1.10",
                "title": (
                    "Are additional services required described (transport, water, sewerage, waste, electricity, "
                    "telecoms, roads, harbors, power-lines, etc.)?"
                ),
            },
            {"number": "1.1.11", "title": "Are any developments likely to occur as a consequence of the project identified?"},
            {"number": "1.1.12", "title": "Are existing activities which will alter or cease identified?"},
            {
                "number": "1.1.13",
                "title": "Are other existing or planned developments with potential cumulative effects identified?",
            },
            {"number": "1.2.1", "title": "Is the area of land occupied by permanent components quantified and shown on scaled maps?"},
            {"number": "1.3.1", "title": "Is the area of land required temporarily for construction quantified and mapped?"},
            {"number": "1.3.2", "title": "Is restoration and after-use of temporarily occupied land described?"},
            {
                "number": "1.3.4",
                "title": "Is the size of structures/works identified (floor area, height, excavations, embankments, stacks, water depth, etc.)?",
            },
            {
                "number": "1.3.5",
                "title": "Is the form and appearance of structures described (materials, colors, design, plant species, etc.)?",
            },
            {"number": "1.3.6", "title": "For urban projects - numbers and characteristics of new populations/businesses described?"},
            {"number": "1.3.7", "title": "For displacement projects - numbers and characteristics of displaced people/businesses described?"},
            {
                "number": "1.3.8",
                "title": "For transport projects - type, volume, temporal pattern, and distribution of traffic described?",
            },
            {"number": "1.4.1", "title": "Are all operating processes described (manufacturing, extraction, etc.)?"},
            {"number": "1.4.2", "title": "Are types and quantities of outputs described?"},
            {"number": "1.4.3", "title": "Are types and quantities of raw materials and energy needed discussed?"},
            {"number": "1.4.4", "title": "Are environmental implications of sourcing raw materials discussed?"},
            {"number": "1.4.5", "title": "Is efficiency in use of energy and raw materials discussed?"},
            {"number": "1.5.1", "title": "Are hazardous materials identified and quantified (construction, operation, commissioning)?"},
            {"number": "1.5.2", "title": "Is transport of raw materials and traffic movements discussed?"},
            {"number": "1.5.3", "title": "Is employment created or lost discussed (by phase)?"},
            {"number": "1.5.4", "title": "Are access arrangements and worker/visitor traffic movements estimated?"},
            {"number": "1.5.5", "title": "Is housing and services for employees discussed (if relevant)?"},
            {"number": "1.5.6", "title": "Are types and quantities of solid waste identified (by phase)?"},
            {"number": "1.6.1", "title": "Composition and hazards of solid wastes discussed?"},
            {"number": "1.6.2", "title": "Methods for collecting, storing, treating, transporting, and disposing of solid wastes described?"},
            {"number": "1.6.3", "title": "Locations for final disposal of solid wastes discussed?"},
            {"number": "1.6.4", "title": "Types and quantities of liquid effluents identified (by phase)?"},
            {"number": "1.6.5", "title": "Composition and hazards of liquid effluents discussed?"},
            {"number": "1.6.6", "title": "Methods for collecting, storing, treating, transporting, and disposing of liquid effluents described?"},
            {"number": "1.6.7", "title": "Locations for final disposal of liquid effluents discussed?"},
            {"number": "1.6.8", "title": "Types and quantities of gaseous and particulate emissions identified (by phase)?"},
            {"number": "1.6.9", "title": "Composition and hazards of air emissions discussed?"},
            {"number": "1.6.10", "title": "Methods for collecting, treating, and discharging air emissions described?"},
            {"number": "1.6.11", "title": "Locations and characteristics of air discharges identified (stack height, velocity, temperature)?"},
            {"number": "1.6.12", "title": "Potential for resource recovery from wastes discussed?"},
            {"number": "1.6.13", "title": "Sources of noise, heat, light, or electromagnetic radiation identified and quantified?"},
            {"number": "1.6.14", "title": "Methods for estimating residues/emissions and difficulties discussed?"},
            {"number": "1.6.15", "title": "Uncertainty attached to estimates discussed?"},
            {
                "number": "1.7.1",
                "title": (
                    "Are risks associated with the project discussed (hazardous materials, spills, fire, explosion, "
                    "traffic, process failure, natural disasters)?"
                ),
            },
            {
                "number": "1.7.2",
                "title": "Are measures to prevent and respond to accidents described (prevention, training, contingency, emergency plans)?",
            },
        ],
    },
    "2": {
        "title": "CONSIDERATION OF ALTERNATIVES",
        "subsections": [
            {"number": "2.1", "title": "Is the process by which the project was developed described, and are alternatives considered?"},
            {"number": "2.2", "title": "Are the alternatives realistic and genuine?"},
            {"number": "2.3", "title": "Are the main reasons for choice of the proposed project explained (including environmental reasons)?"},
            {"number": "2.4", "title": "Are the main environmental effects of the alternatives compared with the proposed project?"},
        ],
    },
    "3": {
        "title": "DESCRIPTION OF THE ENVIRONMENT LIKELY TO BE AFFECTED",
        "subsections": [
            {"number": "3.1.1", "title": "Existing land uses and people using the land described?"},
            {"number": "3.1.2", "title": "Topography, geology, and soils described?"},
            {"number": "3.1.3", "title": "Significant topographic/geological features and soil conditions (quality, stability, erosion, contamination) described?"},
            {"number": "3.1.4", "title": "Fauna, flora, and habitats described and mapped?"},
            {"number": "3.1.5", "title": "Species populations and protected areas/species defined?"},
            {"number": "3.1.6", "title": "Water environment described?"},
            {"number": "3.1.7", "title": "Hydrology, water quality, and water uses described?"},
            {"number": "3.1.8", "title": "Local climate, meteorology, and air quality described?"},
            {"number": "3.1.9", "title": "Existing noise climate described?"},
            {"number": "3.1.10", "title": "Existing light, heat, and electromagnetic radiation described?"},
            {"number": "3.1.11", "title": "Material assets (buildings, minerals, water resources) described?"},
            {"number": "3.2.1", "title": "Archaeological, historic, architectural, or cultural features described (including protected sites)?"},
            {"number": "3.2.2", "title": "Demographic, social, and socio-economic conditions described?"},
            {"number": "3.2.3", "title": "Future changes in the environment without the project (No Project / Moving Baseline) described?"},
            {"number": "3.3.1", "title": "Study area defined widely enough?"},
            {"number": "3.3.2", "title": "All relevant agencies contacted?"},
            {"number": "3.3.3", "title": "Sources of data adequately referenced?"},
            {"number": "3.3.4", "title": "Survey methods, difficulties, and uncertainties described?"},
            {"number": "3.3.5", "title": "Methods appropriate for the purpose?"},
            {"number": "3.3.6", "title": "Important data gaps identified and how they were handled explained?"},
        ],
    },
    "4": {
        "title": "DESCRIPTION OF THE LIKELY SIGNIFICANT EFFECTS",
        "subsections": [
            {"number": "4.1.1", "title": "Scoping process described?"},
            {"number": "4.1.2", "title": "Systematic approach to scoping evident?"},
            {"number": "4.1.3", "title": "Full consultation carried out during scoping?"},
            {"number": "4.1.4", "title": "Comments and views of consultees presented?"},
            {"number": "4.4.1", "title": "Secondary effects described?"},
            {"number": "4.4.2", "title": "Temporary/short-term effects described?"},
            {"number": "4.4.3", "title": "Permanent effects described?"},
            {"number": "4.4.4", "title": "Long-term effects described?"},
            {"number": "4.4.5", "title": "Ancillary activities effects described?"},
            {"number": "4.4.6", "title": "Indirect/consequential development effects described?"},
            {"number": "4.4.7", "title": "Cumulative effects with other developments described (including worst-case)?"},
            {"number": "4.4.8", "title": "Geographic extent, duration, frequency, reversibility, probability described?"},
            {"number": "4.5.1", "title": "Primary and secondary effects on human health and welfare described/quantified?"},
            {"number": "4.5.2", "title": "Impacts on biodiversity, climate change, and sustainable development discussed?"},
            {"number": "4.6.1", "title": "Significance discussed in terms of legal compliance and sensitivity of receptors?"},
            {"number": "4.6.2", "title": "Appropriate standards and guidance used?"},
            {"number": "4.6.3", "title": "Positive effects described as well as negative?"},
            {"number": "4.6.4", "title": "Significance of each effect clearly explained?"},
            {"number": "4.7.1", "title": "Methods used to predict effects described and justified?"},
            {"number": "4.7.2", "title": "Worst-case predictions used where uncertain?"},
            {"number": "4.7.3", "title": "Difficulties in data compilation acknowledged?"},
            {"number": "4.7.4", "title": "Level of treatment appropriate to importance?"},
            {"number": "4.7.5", "title": "Emphasis given to most severe effects?"},
        ],
    },
    "5": {
        "title": "DESCRIPTION OF MITIGATION",
        "subsections": [
            {"number": "5.1", "title": "Significant adverse effects and potential for mitigation discussed?"},
            {"number": "5.2", "title": "Effect of mitigation on magnitude and significance explained?"},
            {"number": "5.3", "title": "Reasons for choosing proposed mitigation explained?"},
            {"number": "5.4", "title": "Full range of mitigation approaches considered (avoid, reduce, remedy, compensate, etc.)?"},
            {"number": "5.5", "title": "Arrangements to monitor and manage residual impacts proposed?"},
            {"number": "5.6", "title": "Any negative effects of the proposed mitigation described?"},
        ],
    },
    "6": {
        "title": "NON-TECHNICAL SUMMARY",
        "subsections": [
            {"number": "6.1", "title": "Does the EIA include a Non-Technical Summary?"},
            {"number": "6.2", "title": "Is it concise but comprehensive (project, environment, effects, mitigation)?"},
            {"number": "6.3", "title": "Does it explain the development consent process and role of EIA?"},
            {"number": "6.4", "title": "Does it provide an overview of the assessment approach?"},
            {"number": "6.5", "title": "Is it written in non-technical language?"},
        ],
    },
    "7": {
        "title": "REGULATORY FRAMEWORK",
        "subsections": [
            {"number": "7.1", "title": "Relevant Kuwait regulations (KEPA, Ministry of Oil, etc.) provided?"},
            {"number": "7.2", "title": "Applicable environmental standards discussed (Noise, Air, Effluent, Waste, Soil, Biodiversity, etc.)?"},
            {"number": "7.3", "title": "KOC HSE MS Policy, Vision & Mission clearly described?"},
            {"number": "7.4", "title": "Applicable features of KOC EIA Procedure implemented?"},
            {"number": "7.5", "title": "Relevant HSE MS Procedures utilized or referenced?"},
        ],
    },
    "8": {
        "title": "QUALITY OF PRESENTATION",
        "subsections": [
            {"number": "8.1", "title": "Information available in clearly defined document(s)?"},
            {"number": "8.2", "title": "Logically organized and clearly structured?"},
            {"number": "8.3", "title": "Table of contents present?"},
            {"number": "8.4", "title": "Clear description of process followed?"},
            {"number": "8.5", "title": "Comprehensive but concise?"},
            {"number": "8.6", "title": "Effective use of tables, figures, maps, photos?"},
            {"number": "8.7", "title": "Effective use of annexes/appendices?"},
            {"number": "8.8", "title": "All analyses and conclusions supported by evidence?"},
            {"number": "8.9", "title": "Consistent terminology used?"},
            {"number": "8.10", "title": "Reads as a single document with good cross-referencing?"},
            {"number": "8.11", "title": "Presentation fair, impartial, and objective?"},
        ],
    },
}


EIA_BUILDER_STRUCTURE = {
    "1": {"title": "EXECUTIVE SUMMARY", "subsections": [
        {"number": "1.1", "title": "Non-Technical Executive Summary"},
        {"number": "1.2", "title": "Key Impacts, Mitigation and Decision Readiness"},
    ]},
    "2": {"title": "PROJECT DESCRIPTION", "subsections": [
        {"number": "2.1", "title": "Project Need, Objectives and Location"},
        {"number": "2.2", "title": "Project Components, Layout and Design"},
        {"number": "2.3", "title": "Construction, Operation and Decommissioning"},
        {"number": "2.4", "title": "Inputs, Outputs, Emissions, Waste and Resources"},
        {"number": "2.5", "title": "Programme, Workforce and Associated Facilities"},
    ]},
    "3": {"title": "POLICY, LEGAL AND REGULATORY FRAMEWORK", "subsections": [
        {"number": "3.1", "title": "Applicable National and Local Requirements"},
        {"number": "3.2", "title": "International Standards and Project Commitments"},
        {"number": "3.3", "title": "Permits, Approvals and Compliance Obligations"},
    ]},
    "4": {"title": "ALTERNATIVES ASSESSMENT", "subsections": [
        {"number": "4.1", "title": "No-Project Alternative"},
        {"number": "4.2", "title": "Site, Design, Technology and Process Alternatives"},
        {"number": "4.3", "title": "Comparison and Selection of the Preferred Alternative"},
    ]},
    "5": {"title": "ENVIRONMENTAL AND SOCIAL BASELINE", "subsections": [
        {"number": "5.1", "title": "Study Area, Methods, Sources and Limitations"},
        {"number": "5.2", "title": "Physical Environment"},
        {"number": "5.3", "title": "Biodiversity and Ecosystem Services"},
        {"number": "5.4", "title": "Social, Health, Cultural Heritage and Land Use"},
        {"number": "5.5", "title": "Sensitive Receptors and Future Baseline"},
    ]},
    "6": {"title": "IMPACT ASSESSMENT", "subsections": [
        {"number": "6.1", "title": "Scoping and Assessment Methodology"},
        {"number": "6.2", "title": "Construction Impacts"},
        {"number": "6.3", "title": "Operational Impacts"},
        {"number": "6.4", "title": "Decommissioning, Accidents and Unplanned Events"},
        {"number": "6.5", "title": "Impact Significance and Residual Effects"},
    ]},
    "7": {"title": "MITIGATION AND ENVIRONMENTAL MANAGEMENT", "subsections": [
        {"number": "7.1", "title": "Mitigation Hierarchy and Commitments"},
        {"number": "7.2", "title": "Environmental and Social Management Plan"},
        {"number": "7.3", "title": "Responsibilities, Resources and Corrective Action"},
    ]},
    "8": {"title": "MONITORING PROGRAMME", "subsections": [
        {"number": "8.1", "title": "Monitoring Indicators, Methods and Locations"},
        {"number": "8.2", "title": "Thresholds, Frequency, Reporting and Response"},
    ]},
    "9": {"title": "CUMULATIVE IMPACTS", "subsections": [
        {"number": "9.1", "title": "Other Developments and Valued Receptors"},
        {"number": "9.2", "title": "Cumulative Effects, Mitigation and Residual Risk"},
    ]},
    "10": {"title": "CLIMATE, CARBON AND RESILIENCE", "subsections": [
        {"number": "10.1", "title": "Greenhouse Gas Emissions and Mitigation"},
        {"number": "10.2", "title": "Climate Risk, Adaptation and Resilience"},
    ]},
    "11": {"title": "STAKEHOLDER AND CONSULTATION RECORD", "subsections": [
        {"number": "11.1", "title": "Stakeholder Identification and Engagement"},
        {"number": "11.2", "title": "Issues Raised, Responses and Commitments"},
        {"number": "11.3", "title": "Grievance and Ongoing Engagement"},
    ]},
    "12": {"title": "COMPLIANCE MATRIX", "subsections": [
        {"number": "12.1", "title": "Requirement-to-Evidence Compliance Matrix"},
        {"number": "12.2", "title": "Outstanding Obligations and Actions"},
    ]},
    "13": {"title": "ENVIRONMENTAL INTELLIGENCE AND QA", "subsections": [
        {"number": "13.1", "title": "Evidence Traceability and Quality Assurance"},
        {"number": "13.2", "title": "Data Gaps, Uncertainty and AI Transparency"},
        {"number": "13.3", "title": "Professional Review and Reviewer Decisions"},
    ]},
    "14": {"title": "CONCLUSIONS AND DECISION READINESS", "subsections": [
        {"number": "14.1", "title": "Overall Conclusions and Residual Effects"},
        {"number": "14.2", "title": "Conditions, Priority Actions and Decision Readiness"},
    ]},
    "A": {"title": "APPENDICES AND EVIDENCE REGISTER", "subsections": [
        {"number": "A.1", "title": "Appendix Schedule"},
        {"number": "A.2", "title": "Evidence Register"},
        {"number": "A.3", "title": "Figures, Tables and Supporting Records"},
    ]},
}

# Backward-compatible import for code that still names the old constant.
EIA_STRUCTURE = RQEIA_REVIEW_STRUCTURE


def seed_eia_structure(db: Session, document: EiaDocument) -> None:
    subsection_order = 1
    for section_order, (section_number, section_data) in enumerate(EIA_BUILDER_STRUCTURE.items(), start=1):
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
            subsection_order += 1

    db.flush()


def _importance_for_checklist_item(checklist_section: str) -> str:
    if checklist_section.count(".") >= 2:
        return "HIGH"
    return "MEDIUM"
