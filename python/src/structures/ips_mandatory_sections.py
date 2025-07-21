"""
IPS Mandatory Sections.

This module corresponds to the original ips_mandatory_sections.ts
"""

from .ips_sections import IPSSections


class IPSMandatorySections:
    """IPS mandatory sections constants."""
    
    PATIENT = IPSSections.PATIENT
    ALLERGIES = IPSSections.ALLERGIES
    MEDICATIONS = IPSSections.MEDICATIONS
    PROBLEMS = IPSSections.PROBLEMS
    IMMUNIZATIONS = IPSSections.IMMUNIZATIONS
