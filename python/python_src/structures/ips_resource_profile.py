"""
IPS Resource Profile.

This module corresponds to the original ips_resource_profile.ts
"""

from typing import TypedDict, List


class IPSResourceProfile(TypedDict):
    """IPS resource profile interface."""
    
    resourceType: str
    mandatoryFields: List[str]
    recommendedFields: List[str]
    loincCode: str
    profileUrl: str
