"""
Basic FHIR type definitions.

This module provides type definitions for FHIR resources and elements.
"""

from typing import Dict, List, Any, Optional, Union


# Basic type aliases
ResourceType = str
ResourceId = str
Reference = str
DateTime = str
Date = str
Code = str
Uri = str
Url = str
Canonical = str
Markdown = str
Xhtml = str
Boolean = bool
Integer = int
Decimal = float
Base64Binary = str
Instant = str
Time = str
Uuid = str
Oid = str

# Use TypedDict-like structures but simplified as Dict[str, Any] for easier usage
TCoding = Dict[str, Any]
TCodeableConcept = Dict[str, Any]
TIdentifier = Dict[str, Any]
TReference = Dict[str, Any]
TNarrative = Dict[str, Any]
TCompositionSection = Dict[str, Any]
TResource = Dict[str, Any]
TDomainResource = Dict[str, Any]
TPatient = Dict[str, Any]
TComposition = Dict[str, Any]
TBundleEntry = Dict[str, Any]
TBundle = Dict[str, Any]
TOrganization = Dict[str, Any]
TAllergyIntolerance = Dict[str, Any]
TMedicationStatement = Dict[str, Any]
TCondition = Dict[str, Any]
TImmunization = Dict[str, Any]
TObservation = Dict[str, Any]

# Keep some basic dataclass for interfaces
from dataclasses import dataclass

@dataclass
class Coding:
    """FHIR Coding element."""
    system: Optional[Uri] = None
    version: Optional[str] = None
    code: Optional[Code] = None
    display: Optional[str] = None
    userSelected: Optional[Boolean] = None

@dataclass
class CodeableConcept:
    """FHIR CodeableConcept element."""
    coding: Optional[List[Coding]] = None
    text: Optional[str] = None

@dataclass
class Identifier:
    """FHIR Identifier element."""
    use: Optional[Code] = None
    type: Optional[CodeableConcept] = None
    system: Optional[Uri] = None
    value: Optional[str] = None
    period: Optional[Dict[str, Any]] = None
    assigner: Optional[Dict[str, Any]] = None

@dataclass
class Reference:
    """FHIR Reference element."""
    reference: Optional[str] = None
    type: Optional[Uri] = None
    identifier: Optional[Identifier] = None
    display: Optional[str] = None

@dataclass
class Narrative:
    """FHIR Narrative element."""
    status: Code
    div: Xhtml

@dataclass
class CompositionSection:
    """FHIR Composition.section element."""
    title: Optional[str] = None
    code: Optional[CodeableConcept] = None
    author: Optional[List[Reference]] = None
    focus: Optional[Reference] = None
    text: Optional[Narrative] = None
    mode: Optional[Code] = None
    orderedBy: Optional[CodeableConcept] = None
    entry: Optional[List[Reference]] = None
    emptyReason: Optional[CodeableConcept] = None
    section: Optional[List['CompositionSection']] = None

@dataclass
class BundleEntry:
    """FHIR Bundle.entry element."""
    link: Optional[List[Dict[str, Any]]] = None
    fullUrl: Optional[Uri] = None
    resource: Optional[Dict[str, Any]] = None
    search: Optional[Dict[str, Any]] = None
    request: Optional[Dict[str, Any]] = None
    response: Optional[Dict[str, Any]] = None

# Simple resource creation functions
def create_patient(**kwargs) -> TPatient:
    """Create a Patient resource dictionary."""
    patient = {
        'resourceType': 'Patient',
        **kwargs
    }
    return patient

def create_composition(**kwargs) -> TComposition:
    """Create a Composition resource dictionary."""
    composition = {
        'resourceType': 'Composition',
        **kwargs
    }
    return composition

def create_bundle(**kwargs) -> TBundle:
    """Create a Bundle resource dictionary."""
    bundle = {
        'resourceType': 'Bundle',
        'entry': [],
        **kwargs
    }
    return bundle

def create_organization(**kwargs) -> TOrganization:
    """Create an Organization resource dictionary."""
    organization = {
        'resourceType': 'Organization',
        **kwargs
    }
    return organization

def create_bundle_entry(**kwargs) -> TBundleEntry:
    """Create a Bundle entry dictionary."""
    return kwargs

# Legacy aliases for compatibility
Patient = TPatient
Composition = TComposition
Bundle = TBundle
Organization = TOrganization
