"""
IPS Recommended Sections.

This module corresponds to the original ips_recommended_sections.ts
"""

from .ips_sections import IPSSections


class IPSRecommendedSections:
    """IPS recommended sections constants."""
    
    MEDICAL_DEVICES = 'Device'
    PREGNANCY_STATUS = 'PregnancyStatus'
    FUNCTIONAL_STATUS = 'FunctionalStatus'
    ADVANCED_DIRECTIVES = 'Consent'
    DIAGNOSTIC_REPORTS = IPSSections.DIAGNOSTIC_REPORTS
    VITAL_SIGNS = IPSSections.VITAL_SIGNS
