"""
IPS Section Resource Mapping

Maps IPS sections to FHIR resource types and provides filtering functions.
"""

from typing import List, Dict, Optional, Callable, Any
from .ips_sections import IPSSections


# Mapping of IPSSections to FHIR resource types
IPS_SECTION_RESOURCE_MAP: Dict[IPSSections, List[str]] = {
    IPSSections.PATIENT: ['Patient'],
    IPSSections.ALLERGIES: ['AllergyIntolerance'],
    IPSSections.MEDICATIONS: ['MedicationRequest', 'MedicationStatement'],
    IPSSections.PROBLEMS: ['Condition'],
    IPSSections.IMMUNIZATIONS: ['Immunization'],
    IPSSections.VITAL_SIGNS: ['Observation'],
    IPSSections.MEDICAL_DEVICES: ['Device'],
    IPSSections.DIAGNOSTIC_REPORTS: ['DiagnosticReport', 'Observation'],  # Diagnostic reports can include Observations
    IPSSections.PROCEDURES: ['Procedure'],
    IPSSections.FAMILY_HISTORY: ['FamilyMemberHistory'],
    IPSSections.SOCIAL_HISTORY: ['Observation'],  # Social history is often Observation
    IPSSections.PREGNANCY_HISTORY: ['Observation'],  # Pregnancy history is often Observation
    IPSSections.FUNCTIONAL_STATUS: ['Observation'],  # Functional status is often Observation
    IPSSections.MEDICAL_HISTORY: ['Condition'],  # Medical history is often Condition
    IPSSections.CARE_PLAN: ['CarePlan'],
    IPSSections.CLINICAL_IMPRESSION: ['ClinicalImpression'],
    IPSSections.ADVANCE_DIRECTIVES: ['DocumentReference']  # Advance directives are often stored as DocumentReference
}


# Type alias for resource filter functions
IPSSectionResourceFilter = Callable[[Any], bool]


def _allergy_filter(resource: Any) -> bool:
    """Only include active allergies."""
    return (resource.get('resourceType') == 'AllergyIntolerance' and 
            resource.get('clinicalStatus', {}).get('coding', [{}])[0].get('code') == 'active')


def _medication_filter(resource: Any) -> bool:
    """Only include active medication requests/statements."""
    resource_type = resource.get('resourceType')
    status = resource.get('status')
    return ((resource_type == 'MedicationRequest' and status == 'active') or
            (resource_type == 'MedicationStatement' and status == 'active'))


def _problem_filter(resource: Any) -> bool:
    """Only include active problems/conditions."""
    return (resource.get('resourceType') == 'Condition' and 
            resource.get('clinicalStatus', {}).get('coding', [{}])[0].get('code') == 'active')


def _immunization_filter(resource: Any) -> bool:
    """Only include completed immunizations."""
    return resource.get('resourceType') == 'Immunization' and resource.get('status') == 'completed'


def _vital_signs_filter(resource: Any) -> bool:
    """Only include vital sign Observations (category.coding contains 'vital-signs')."""
    if resource.get('resourceType') != 'Observation':
        return False
    categories = resource.get('category', [])
    return any(
        any(coding.get('code') == 'vital-signs' for coding in cat.get('coding', []))
        for cat in categories
    )


def _medical_devices_filter(resource: Any) -> bool:
    """Only include active devices."""
    return resource.get('resourceType') == 'Device' and resource.get('status') == 'active'


def _diagnostic_reports_filter(resource: Any) -> bool:
    """Only include finalized diagnostic reports."""
    return (resource.get('resourceType') in ["DiagnosticReport", "Observation"] and 
            resource.get('status') == 'final')


def _procedures_filter(resource: Any) -> bool:
    """Only include completed procedures."""
    return resource.get('resourceType') == 'Procedure' and resource.get('status') == 'completed'


def _family_history_filter(resource: Any) -> bool:
    """Only include family history resources."""
    return resource.get('resourceType') == 'FamilyMemberHistory'


def _social_history_filter(resource: Any) -> bool:
    """Only include social history Observations (category.coding contains 'social-history')."""
    if resource.get('resourceType') != 'Observation':
        return False
    categories = resource.get('category', [])
    return any(
        any(coding.get('code') == 'social-history' for coding in cat.get('coding', []))
        for cat in categories
    )


def _pregnancy_history_filter(resource: Any) -> bool:
    """Only include pregnancy history Observations (category.coding contains 'pregnancy')."""
    if resource.get('resourceType') != 'Observation':
        return False
    categories = resource.get('category', [])
    return any(
        any(coding.get('code') == 'pregnancy' for coding in cat.get('coding', []))
        for cat in categories
    )


def _functional_status_filter(resource: Any) -> bool:
    """Only include functional status Observations (category.coding contains 'functional-status')."""
    if resource.get('resourceType') != 'Observation':
        return False
    categories = resource.get('category', [])
    return any(
        any(coding.get('code') == 'functional-status' for coding in cat.get('coding', []))
        for cat in categories
    )


def _medical_history_filter(resource: Any) -> bool:
    """Only include active medical history Conditions."""
    return (resource.get('resourceType') == 'Condition' and 
            resource.get('clinicalStatus', {}).get('coding', [{}])[0].get('code') == 'active')


def _care_plan_filter(resource: Any) -> bool:
    """Only include active care plans."""
    return resource.get('resourceType') == 'CarePlan' and resource.get('status') == 'active'


def _clinical_impression_filter(resource: Any) -> bool:
    """Only include ClinicalImpression resources."""
    return resource.get('resourceType') == 'ClinicalImpression'


def _patient_filter(resource: Any) -> bool:
    """Patient section: only Patient resource."""
    return resource.get('resourceType') == 'Patient'


# Optionally, define custom filter functions for each section
IPS_SECTION_RESOURCE_FILTERS: Dict[IPSSections, IPSSectionResourceFilter] = {
    IPSSections.ALLERGIES: _allergy_filter,
    IPSSections.MEDICATIONS: _medication_filter,
    IPSSections.PROBLEMS: _problem_filter,
    IPSSections.IMMUNIZATIONS: _immunization_filter,
    IPSSections.VITAL_SIGNS: _vital_signs_filter,
    IPSSections.MEDICAL_DEVICES: _medical_devices_filter,
    IPSSections.DIAGNOSTIC_REPORTS: _diagnostic_reports_filter,
    IPSSections.PROCEDURES: _procedures_filter,
    IPSSections.FAMILY_HISTORY: _family_history_filter,
    IPSSections.SOCIAL_HISTORY: _social_history_filter,
    IPSSections.PREGNANCY_HISTORY: _pregnancy_history_filter,
    IPSSections.FUNCTIONAL_STATUS: _functional_status_filter,
    IPSSections.MEDICAL_HISTORY: _medical_history_filter,
    IPSSections.CARE_PLAN: _care_plan_filter,
    IPSSections.CLINICAL_IMPRESSION: _clinical_impression_filter,
    IPSSections.PATIENT: _patient_filter,
}


class IPSSectionResourceHelper:
    """Helper class to get resource types for a section."""
    
    @staticmethod
    def get_resource_types_for_section(section: IPSSections) -> List[str]:
        """Get the resource types for a given IPS section."""
        return IPS_SECTION_RESOURCE_MAP.get(section, [])
    
    @staticmethod
    def get_resource_filter_for_section(section: IPSSections) -> Optional[IPSSectionResourceFilter]:
        """Get the resource filter function for a given IPS section."""
        return IPS_SECTION_RESOURCE_FILTERS.get(section)
