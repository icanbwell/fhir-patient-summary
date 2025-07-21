"""
Comprehensive IPS Composition Builder

Python implementation of the FHIR International Patient Summary generator.
Converted from TypeScript.
"""

from typing import Dict, List, Optional, Set, Any
from datetime import datetime
from ..types.fhir_types import (
    TPatient, TCompositionSection, TDomainResource, TBundle, TComposition, 
    TNarrative, TBundleEntry, TOrganization, TCodeableConcept, TCoding, TReference
)
from ..structures.ips_sections import IPSSections
from ..structures.ips_section_loinc_codes import IPS_SECTION_DISPLAY_NAMES, IPS_SECTION_LOINC_CODES
from ..structures.ips_section_resource_map import IPSSectionResourceHelper
from .narrative_generator import NarrativeGenerator


class ComprehensiveIPSCompositionBuilder:
    """
    Comprehensive IPS Resource Mapping builder.
    
    This class helps build International Patient Summary (IPS) compositions
    from FHIR resources, including narrative generation and validation.
    """
    
    def __init__(self):
        self.patient: Optional[TPatient] = None
        self.sections: List[TCompositionSection] = []
        self.mandatory_sections_added: Set[IPSSections] = set()
        self.resources: List[TDomainResource] = []
    
    def set_patient(self, patient: TPatient) -> 'ComprehensiveIPSCompositionBuilder':
        """
        Sets the patient resource for the IPS Composition.
        This is not needed if you are calling read_bundle, but can be used to set the patient resource directly.
        
        Args:
            patient: FHIR Patient resource to set
            
        Returns:
            Self for method chaining
            
        Raises:
            ValueError: If patient is invalid
        """
        if not patient or patient.get('resourceType') != 'Patient':
            raise ValueError('Invalid Patient resource')
        self.patient = patient
        return self
    
    async def add_section_async(
        self,
        section_type: IPSSections,
        resources: List[TDomainResource],
        timezone: Optional[str] = None,
        options: Optional[Dict[str, Any]] = None
    ) -> 'ComprehensiveIPSCompositionBuilder':
        """
        Adds a section to the composition with async HTML minification.
        
        Args:
            section_type: IPS section type
            resources: Array of domain resources
            timezone: Optional timezone to use for date formatting
            options: Optional configuration options
            
        Returns:
            Self for method chaining
            
        Raises:
            ValueError: If no valid resources for mandatory section
        """
        if options is None:
            options = {}
        
        # Validate resources
        valid_resources = resources.copy()
        
        for resource in valid_resources:
            # Add resource to the internal list (check for duplicates by ID)
            if not any(r.get('id') == resource.get('id') for r in self.resources):
                self.resources.append(resource)
        
        # Skip if no valid resources and not mandatory
        if not valid_resources:
            if not options.get('isOptional', False):
                raise ValueError(f'No valid resources for mandatory section: {section_type}')
            return self
        
        # Patient resource does not get a section, it is handled separately
        if section_type != IPSSections.PATIENT:
            # Create section entry with HTML minification
            narrative: Optional[TNarrative] = await NarrativeGenerator.generate_narrative_async(
                section_type,
                valid_resources,
                timezone,
                True,
                False
            )
            
            section_entry: TCompositionSection = {
                'title': IPS_SECTION_DISPLAY_NAMES.get(section_type, section_type.value),
                'code': {
                    'coding': [{
                        'system': 'http://loinc.org',
                        'code': options.get('customLoincCode') or IPS_SECTION_LOINC_CODES.get(section_type),
                        'display': IPS_SECTION_DISPLAY_NAMES.get(section_type, section_type.value)
                    }],
                    'text': IPS_SECTION_DISPLAY_NAMES.get(section_type, section_type.value)
                },
                'text': narrative,
                'entry': [
                    {
                        'reference': f"{resource.get('resourceType', 'Unknown')}/{resource.get('id', '')}",
                        'display': resource.get('resourceType', 'Unknown')
                    }
                    for resource in valid_resources
                ]
            }
            
            # Track mandatory sections
            if not options.get('isOptional', False):
                self.mandatory_sections_added.add(section_type)
            
            self.sections.append(section_entry)
        
        return self
    
    async def read_bundle_async(
        self,
        bundle: TBundle,
        timezone: Optional[str] = None
    ) -> 'ComprehensiveIPSCompositionBuilder':
        """
        Reads a FHIR Bundle and extracts resources for each section defined in IPSSections.
        
        Args:
            bundle: FHIR Bundle containing resources
            timezone: Optional timezone to use for date formatting
            
        Returns:
            Self for method chaining
            
        Raises:
            ValueError: If Patient resource not found in bundle
        """
        if not getattr(bundle, 'entry', None):
            return self
        
        # Find the patient resource in the bundle
        patient_entry = None
        for entry in bundle.entry:
            resource = getattr(entry, 'resource', None)
            if resource and resource.get('resourceType') == 'Patient':
                patient_entry = entry
                break
        
        if not patient_entry or not getattr(patient_entry, 'resource', None):
            raise ValueError('Patient resource not found in the bundle')
        
        self.patient = patient_entry.resource
        
        # Find resources for each section in IPSSections and add the section
        for section_type in IPSSections:
            resource_types_for_section = IPSSectionResourceHelper.get_resource_types_for_section(section_type)
            custom_filter = IPSSectionResourceHelper.get_resource_filter_for_section(section_type)
            
            resources = []
            for entry in bundle.entry:
                resource = getattr(entry, 'resource', None)
                if resource and resource.get('resourceType') in resource_types_for_section:
                    resources.append(resource)
            
            if custom_filter:
                # Convert resources to dict format for filtering
                resources_dict = [self._resource_to_dict(r) for r in resources]
                filtered_resources_dict = [r for r in resources_dict if custom_filter(r)]
                resources = [self._dict_to_resource(r) for r in filtered_resources_dict]
            
            if resources:
                await self.add_section_async(section_type, resources, timezone, {'isOptional': True})
        
        return self
    
    def build(self, timezone: Optional[str] = None) -> List[TCompositionSection]:
        """
        Builds the final Composition sections, ensuring all mandatory sections are present.
        
        Args:
            timezone: Optional timezone to use for date formatting (e.g., 'America/New_York', 'Europe/London')
            
        Returns:
            List of composition sections
            
        Raises:
            ValueError: If mandatory sections are missing
        """
        # Ensure all mandatory sections are present
        mandatory_sections = [
            IPSSections.ALLERGIES,
            IPSSections.MEDICATIONS,
            IPSSections.PROBLEMS,
            IPSSections.IMMUNIZATIONS
        ]
        
        missing_mandatory_sections = [
            section for section in mandatory_sections 
            if section not in self.mandatory_sections_added
        ]
        
        if missing_mandatory_sections:
            missing_names = [section.value for section in missing_mandatory_sections]
            raise ValueError(f'Missing mandatory IPS sections: {", ".join(missing_names)}')
        
        return self.sections
    
    async def build_bundle_async(
        self,
        author_organization_id: str,
        author_organization_name: str,
        base_url: str,
        timezone: Optional[str] = None
    ) -> TBundle:
        """
        Builds a complete FHIR Bundle containing the Composition and all resources.
        
        Args:
            author_organization_id: ID of the authoring organization (e.g., hospital or clinic)
            author_organization_name: Name of the authoring organization
            base_url: Base URL for the FHIR server (e.g., 'https://example.com/fhir')
            timezone: Optional timezone to use for date formatting (e.g., 'America/New_York', 'Europe/London')
            
        Returns:
            Complete FHIR Bundle
            
        Raises:
            ValueError: If patient resource not set
        """
        if base_url.endswith('/'):
            base_url = base_url[:-1]  # Remove trailing slash if present
        
        if not self.patient:
            raise ValueError('Patient resource must be set before building the bundle')
        
        # Create the Composition resource
        composition: TComposition = {
            'id': f"Composition-{self.patient.get('id', '')}",
            'resourceType': 'Composition',
            'status': 'final',
            'type': {
                'coding': [{
                    'system': 'http://loinc.org',
                    'code': '60591-5',
                    'display': 'Patient summary Document'
                }]
            },
            'subject': {
                'reference': f"Patient/{self.patient.get('id', '')}"
            },
            'author': [{
                'reference': f"Organization/{author_organization_id}",
                'display': author_organization_name
            }],
            'date': datetime.now().isoformat(),
            'title': 'International Patient Summary',
            'section': self.sections,
            'text': await self._create_composition_narrative_async(timezone)
        }
        
        # Create the bundle with proper document type
        bundle: TBundle = {
            'resourceType': 'Bundle',
            'type': 'document',
            'timestamp': datetime.now().isoformat(),
            'identifier': {
                "system": "urn:ietf:rfc:3986",
                "value": "urn:uuid:4dcfd353-49fd-4ab0-b521-c8d57ced74d6"
            },
            'entry': []
        }
        
        # Add Composition as first entry
        bundle['entry'].append({
            'fullUrl': f"{base_url}/Composition/{composition['id']}",
            'resource': composition
        })
        
        # Add patient as second entry
        bundle['entry'].append({
            'fullUrl': f"{base_url}/Patient/{self.patient.get('id', '')}",
            'resource': self.patient
        })
        
        # Extract and add all resources referenced in sections
        for resource in self.resources:
            if resource.get('resourceType') != "Patient":
                bundle['entry'].append({
                    'fullUrl': f"{base_url}/{resource.get('resourceType', '')}/{resource.get('id', '')}",
                    'resource': resource
                })
        
        # Add a bundle entry for Organization
        bundle['entry'].append({
            'fullUrl': f"{base_url}/Organization/{author_organization_id}",
            'resource': {
                'resourceType': 'Organization',
                'id': author_organization_id,
                'name': author_organization_name
            }
        })
        
        return bundle
    
    async def _create_composition_narrative_async(self, timezone: Optional[str] = None) -> TNarrative:
        """
        Creates a narrative for the composition based on the patient and sections.
        
        Args:
            timezone: Optional timezone to use for date formatting (e.g., 'America/New_York', 'Europe/London')
            
        Returns:
            FHIR Narrative object
        """
        full_narrative_content = ""
        
        # Generate narrative for the patient
        patient_narrative = await NarrativeGenerator.generate_narrative_content_async(
            IPSSections.PATIENT,
            [self.patient],
            timezone,
            False
        )
        full_narrative_content += patient_narrative or ''
        
        # Generate narrative for the sections and add to this narrative
        for section_type in IPSSections:
            # Skip the patient section, it is already included above
            if section_type == IPSSections.PATIENT:
                continue
            
            resource_types_for_section = IPSSectionResourceHelper.get_resource_types_for_section(section_type)
            all_resources = list(self.resources)
            resources = [
                r for r in all_resources 
                if r.get('resourceType') in resource_types_for_section
            ]
            
            if resources:
                section_narrative = await NarrativeGenerator.generate_narrative_content_async(
                    section_type,
                    resources,
                    timezone,
                    False
                )
                full_narrative_content += section_narrative or ''
        
        return {
            'status': 'generated',
            'div': await NarrativeGenerator.wrap_in_xhtml_async(full_narrative_content, True)
        }
    
    def _resource_to_dict(self, resource: TDomainResource) -> Dict[str, Any]:
        """Convert resource object to dictionary for filtering."""
        if hasattr(resource, '__dict__'):
            return resource.__dict__
        return resource if isinstance(resource, dict) else {}
    
    def _dict_to_resource(self, resource_dict: Dict[str, Any]) -> TDomainResource:
        """Convert dictionary back to resource object."""
        return resource_dict
