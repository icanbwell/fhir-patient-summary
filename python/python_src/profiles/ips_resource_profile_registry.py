"""
IPS Resource Profile Registry.

This module corresponds to the original ips_resource_profile_registry.ts
"""

from typing import Dict, List, Any
from ..structures.ips_resource_profile import IPSResourceProfile
from ..structures.ips_mandatory_sections import IPSMandatorySections
from ..structures.ips_recommended_sections import IPSRecommendedSections
from ..types.fhir_types import TDomainResource


class IPSResourceProfileRegistry:
    """Registry for IPS resource profiles."""
    
    # Comprehensive resource profiles aligned with IPS specification
    PROFILES: Dict[str, IPSResourceProfile] = {
        IPSMandatorySections.PATIENT: {
            'resourceType': 'Patient',
            'mandatoryFields': [
                # FHIR R4B: No required fields except resourceType, but name and gender are often expected in practice
            ],
            'recommendedFields': [
                'name',
                'gender',
                'birthDate',
                'identifier',
                'address',
                'telecom',
                'communication',
                'maritalStatus'
            ],
            'loincCode': '60591-5',
            'profileUrl': 'http://hl7.org/fhir/uv/ips/StructureDefinition/Patient-uv-ips'
        },
        IPSMandatorySections.ALLERGIES: {
            'resourceType': 'AllergyIntolerance',
            'mandatoryFields': [
                'patient'
            ],
            'recommendedFields': [
                'clinicalStatus',
                'verificationStatus',
                'code',
                'reaction',
                'criticality'
            ],
            'loincCode': '48765-2',
            'profileUrl': 'http://hl7.org/fhir/uv/ips/StructureDefinition/AllergyIntolerance-uv-ips'
        },
        IPSMandatorySections.MEDICATIONS: {
            'resourceType': 'MedicationStatement',
            'mandatoryFields': [
                'status',
                'subject'
            ],
            'recommendedFields': [
                'medicationCodeableConcept',  # or 'medicationReference'
                'effectiveDateTime',  # or 'effectivePeriod'
                'dosage',
                'reasonCode'
            ],
            'loincCode': '10160-0',
            'profileUrl': 'http://hl7.org/fhir/uv/ips/StructureDefinition/MedicationStatement-uv-ips'
        },
        IPSMandatorySections.PROBLEMS: {
            'resourceType': 'Condition',
            'mandatoryFields': [
                'subject'
            ],
            'recommendedFields': [
                'clinicalStatus',
                'verificationStatus',
                'code',
                'onsetDateTime',  # or 'onsetAge', 'onsetPeriod', 'onsetRange', 'onsetString'
                'recordedDate',
                'severity'
            ],
            'loincCode': '11450-4',
            'profileUrl': 'http://hl7.org/fhir/uv/ips/StructureDefinition/Condition-uv-ips'
        },
        IPSMandatorySections.IMMUNIZATIONS: {
            'resourceType': 'Immunization',
            'mandatoryFields': [
                'status',
                'vaccineCode',
                'patient',
                'occurrenceDateTime'  # or 'occurrenceString'
            ],
            'recommendedFields': [
                'lotNumber',
                'manufacturer',
                'doseQuantity'
            ],
            'loincCode': '11369-6',
            'profileUrl': 'http://hl7.org/fhir/uv/ips/StructureDefinition/Immunization-uv-ips'
        }
    }

    # Additional Recommended Sections
    RECOMMENDED_PROFILES: Dict[str, IPSResourceProfile] = {
        IPSRecommendedSections.DIAGNOSTIC_REPORTS: {
            'resourceType': 'Observation',
            'mandatoryFields': [
                'status',
                'code',
                'subject',
                'effectiveDateTime'  # or 'effectivePeriod'
            ],
            'recommendedFields': [
                'category',
                'valueQuantity',  # or value[x]
                'interpretation',
                'referenceRange'
            ],
            'loincCode': '26436-6',
            'profileUrl': 'http://hl7.org/fhir/uv/ips/StructureDefinition/Observation-results-uv-ips'
        },
        IPSRecommendedSections.VITAL_SIGNS: {
            'resourceType': 'Observation',
            'mandatoryFields': [
                'status',
                'code',
                'subject',
                'effectiveDateTime'  # or 'effectivePeriod'
            ],
            'recommendedFields': [
                'category',
                'valueQuantity',  # or value[x]
                'component'
            ],
            'loincCode': '8716-3',
            'profileUrl': 'http://hl7.org/fhir/uv/ips/StructureDefinition/Observation-vitalsigns-uv-ips'
        }
    }

    @classmethod
    def validate_resource(
        cls,
        resource: TDomainResource,
        profile_type: str
    ) -> bool:
        """
        Validate resource against IPS profile.
        
        Args:
            resource: FHIR domain resource to validate
            profile_type: IPS profile type to validate against
            
        Returns:
            True if resource is valid, False otherwise
        """
        profile = cls.PROFILES.get(profile_type) or cls.RECOMMENDED_PROFILES.get(profile_type)

        if not profile:
            print(f"No profile found for resource type: {resource.get('resourceType')}")
            return False

        # Check mandatory fields
        missing_mandatory_fields = [
            field for field in profile['mandatoryFields']
            if field not in resource
        ]

        if missing_mandatory_fields:
            print(
                f"Missing mandatory fields for {profile_type}: {missing_mandatory_fields}"
            )
            return False

        return True
