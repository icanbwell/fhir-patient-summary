"""
Test the ComprehensiveIPSCompositionBuilder.

This test file corresponds to the original summary.test.ts
"""

import pytest
import sys
import os
from typing import List, Dict, Any

# Add the current directory to the Python path
current_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, current_dir)

from python.src.generators.fhir_summary_generator import ComprehensiveIPSCompositionBuilder
from python.src.structures.ips_sections import IPSSections
from python.src.structures.ips_section_loinc_codes import IPS_SECTION_LOINC_CODES
from python.src.types.fhir_types import TPatient


class TestComprehensiveIPSCompositionBuilder:
    """Test suite for ComprehensiveIPSCompositionBuilder."""
    
    @pytest.fixture
    def mock_patient(self) -> TPatient:
        """Mock patient resource."""
        return {
            'resourceType': 'Patient',
            'id': 'example-patient',
            'identifier': [{
                'system': 'http://icanbwell.com',
                'value': '12345'
            }],
            'name': [{
                'family': 'Doe',
                'given': ['John']
            }],
            'gender': 'male',
            'birthDate': '1980-01-01'
        }
    
    @pytest.fixture
    def mock_allergies(self, mock_patient: TPatient) -> List[Dict[str, Any]]:
        """Mock allergy resources."""
        return [{
            'resourceType': 'AllergyIntolerance',
            'id': 'allergy1',
            'clinicalStatus': {
                'coding': [{
                    'system': 'http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical',
                    'code': 'active'
                }]
            },
            'code': {
                'coding': [{
                    'system': 'http://www.nlm.nih.gov/research/umls/rxnorm',
                    'code': '7980',
                    'display': 'Penicillin G'
                }]
            },
            'patient': {'reference': f"Patient/{mock_patient['id']}"}
        }]
    
    @pytest.fixture  
    def mock_medications(self, mock_patient: TPatient) -> List[Dict[str, Any]]:
        """Mock medication resources."""
        return [{
            'resourceType': 'MedicationRequest',
            'id': 'med1',
            'status': 'active',
            'medicationReference': {'display': 'Test Medication'},
            'subject': {'reference': f"Patient/{mock_patient['id']}"},
            'intent': 'order'
        }]
    
    @pytest.fixture
    def mock_conditions(self, mock_patient: TPatient) -> List[Dict[str, Any]]:
        """Mock condition resources."""
        return [
            {
                'resourceType': 'Condition',
                'id': 'e6.ToRrlZE9pwFAPiLa6E2nRUitzucwMQODU8OsVpNGA3',
                'clinicalStatus': {
                    'coding': [{
                        'system': 'http://terminology.hl7.org/CodeSystem/condition-clinical',
                        'code': 'resolved',
                        'display': 'Resolved'
                    }],
                    'text': 'Resolved'
                },
                'verificationStatus': {
                    'coding': [{
                        'system': 'http://terminology.hl7.org/CodeSystem/condition-ver-status',
                        'code': 'confirmed',
                        'display': 'Confirmed'
                    }],
                    'text': 'Confirmed'
                },
                'category': [{
                    'coding': [{
                        'system': 'http://terminology.hl7.org/CodeSystem/condition-category',
                        'code': 'problem-list-item',
                        'display': 'Problem List Item'
                    }],
                    'text': 'Problem List Item'
                }],
                'code': {
                    'coding': [{
                        'system': 'http://hl7.org/fhir/sid/icd-10-cm',
                        'code': 'J18.9',
                        'display': 'Pneumonia, unspecified organism'
                    }],
                    'text': 'Pneumonia'
                },
                'subject': {
                    'reference': 'Patient/example-patient',
                    'display': 'FHIR, Automation'
                },
                'onsetDateTime': '2016-12-05',
                'abatementDateTime': '2016-12-20',
                'recordedDate': '2020-03-04'
            },
            {
                'resourceType': 'Condition',
                'id': 'eK.v1ndIFKTZm1ve0TRFa2byekZbTkS0xnsoQOqN-o5I3',
                'clinicalStatus': {
                    'coding': [{
                        'system': 'http://terminology.hl7.org/CodeSystem/condition-clinical',
                        'code': 'active',
                        'display': 'Active'
                    }],
                    'text': 'Active'
                },
                'verificationStatus': {
                    'coding': [{
                        'system': 'http://terminology.hl7.org/CodeSystem/condition-ver-status',
                        'code': 'confirmed',
                        'display': 'Confirmed'
                    }],
                    'text': 'Confirmed'
                },
                'category': [{
                    'coding': [{
                        'system': 'http://terminology.hl7.org/CodeSystem/condition-category',
                        'code': 'problem-list-item',
                        'display': 'Problem List Item'
                    }],
                    'text': 'Problem List Item'
                }],
                'code': {
                    'coding': [{
                        'system': 'http://hl7.org/fhir/sid/icd-10-cm',
                        'code': 'I10',
                        'display': 'Essential (primary) hypertension'
                    }],
                    'text': 'Essential hypertension'
                },
                'subject': {
                    'reference': 'Patient/example-patient',
                    'display': 'FHIR, Automation'
                },
                'onsetDateTime': '2020-03-04',
                'recordedDate': '2020-03-04',
                'severity': {
                    'text': 'Med'
                }
            }
        ]
    
    @pytest.fixture
    def mock_immunizations(self, mock_patient: TPatient) -> List[Dict[str, Any]]:
        """Mock immunization resources."""
        return [
            {
                'resourceType': 'Immunization',
                'id': 'emAKcOP2creGzeLlEt5R4MBF6oYm0wzxJ9aWwOTiOqHI3',
                'identifier': [{
                    'use': 'usual',
                    'system': 'urn:oid:1.2.840.114350.1.13.1.1.7.2.768076',
                    'value': '1000000246'
                }],
                'status': 'completed',
                'vaccineCode': {
                    'coding': [{
                        'system': 'http://hl7.org/fhir/sid/cvx',
                        'code': '03'
                    }],
                    'text': 'MMR'
                },
                'patient': {
                    'reference': 'Patient/example-patient',
                    'display': 'FHIR, Automation'
                },
                'occurrenceDateTime': '2000-03-04',
                'primarySource': False,
                'reportOrigin': {
                    'coding': [{
                        'system': 'urn:oid:1.2.840.114350.1.13.1.1.7.10.768076.4082',
                        'code': '1',
                        'display': 'Patient reported'
                    }],
                    'text': 'Patient reported'
                },
                'location': {
                    'display': 'right arm'
                },
                'performer': [{
                    'function': {
                        'coding': [{
                            'system': 'http://terminology.hl7.org/CodeSystem/v2-0443',
                            'code': 'AP',
                            'display': 'Administering Provider'
                        }],
                        'text': 'Administering Provider'
                    },
                    'actor': {
                        'reference': 'Practitioner/example-practitioner',
                        'type': 'Practitioner',
                        'display': 'Starter Provider'
                    }
                }],
                'note': [{
                    'text': 'comment on MMR'
                }]
            },
            {
                'resourceType': 'Immunization',
                'id': 'emAKcOP2creGzeLlEt5R4MFyM.TLHisGiY2OL7vh-KKI3',
                'identifier': [{
                    'use': 'usual',
                    'system': 'urn:oid:1.2.840.114350.1.13.1.1.7.2.768076',
                    'value': '1000000244'
                }],
                'status': 'completed',
                'vaccineCode': {
                    'coding': [{
                        'system': 'http://hl7.org/fhir/sid/cvx',
                        'code': '107'
                    }],
                    'text': 'DTaP, Unspecified Formulation (IST) Imm-rx'
                },
                'patient': {
                    'reference': 'Patient/example-patient',
                    'display': 'FHIR, Automation'
                },
                'occurrenceDateTime': '2020-03-04T18:56:00Z',
                'primarySource': True,
                'location': {
                    'display': 'connectathon-testing for EpicConnect and Pulsar testing only'
                },
                'manufacturer': {
                    'display': 'Merck, Sharp, Dohme'
                },
                'lotNumber': '486745',
                'expirationDate': '2030-03-04',
                'site': {
                    'coding': [{
                        'system': 'urn:oid:1.2.840.114350.1.13.1.1.7.10.768076.4040',
                        'code': '14',
                        'display': 'Left arm'
                    }],
                    'text': 'Left arm'
                },
                'route': {
                    'coding': [{
                        'system': 'urn:oid:1.2.840.114350.1.13.1.1.7.10.768076.4030',
                        'code': '2',
                        'display': 'Intramuscular'
                    }],
                    'text': 'Intramuscular'
                },
                'doseQuantity': {
                    'value': 0.5,
                    'unit': 'mL',
                    'system': 'urn:oid:1.2.840.114350.1.13.1.1.7.10.768076.4019',
                    'code': '1'
                },
                'performer': [{
                    'function': {
                        'coding': [{
                            'system': 'http://terminology.hl7.org/CodeSystem/v2-0443',
                            'code': 'AP',
                            'display': 'Administering Provider'
                        }],
                        'text': 'Administering Provider'
                    },
                    'actor': {
                        'reference': 'Practitioner/example-practitioner',
                        'type': 'Practitioner',
                        'display': 'Emily Williams, MD'
                    }
                }],
                'note': [{
                    'text': 'comment on DTAP'
                }]
            }
        ]

    def test_constructor(self, mock_patient: TPatient):
        """Test that an instance can be created with a valid patient."""
        builder = ComprehensiveIPSCompositionBuilder().set_patient(mock_patient)
        assert builder is not None
        assert builder.patient == mock_patient

    def test_invalid_patient_throws_error(self):
        """Test that an error is thrown if patient resource is invalid."""
        with pytest.raises(ValueError, match='Invalid Patient resource'):
            ComprehensiveIPSCompositionBuilder().set_patient(None)
        
        with pytest.raises(ValueError, match='Invalid Patient resource'):
            ComprehensiveIPSCompositionBuilder().set_patient({'resourceType': 'Organization'})

    @pytest.mark.asyncio
    async def test_add_section(self, mock_patient: TPatient, mock_allergies: List[Dict[str, Any]]):
        """Test that a section can be added with valid resources."""
        builder = ComprehensiveIPSCompositionBuilder().set_patient(mock_patient)
        
        result = await builder.add_section_async(IPSSections.ALLERGIES, mock_allergies, 'America/New_York')
        
        assert result == builder

    def test_build_missing_mandatory_sections(self, mock_patient: TPatient):
        """Test that build throws an error when mandatory sections are missing."""
        builder = ComprehensiveIPSCompositionBuilder().set_patient(mock_patient)
        
        # Should throw error when trying to build with no valid sections
        with pytest.raises(ValueError, match='Missing mandatory IPS sections'):
            builder.build('America/New_York')

    @pytest.mark.asyncio
    async def test_build_with_all_mandatory_sections(
        self, 
        mock_patient: TPatient,
        mock_allergies: List[Dict[str, Any]],
        mock_medications: List[Dict[str, Any]],
        mock_conditions: List[Dict[str, Any]],
        mock_immunizations: List[Dict[str, Any]]
    ):
        """Test building a composition with all mandatory sections."""
        timezone = 'America/New_York'
        builder = ComprehensiveIPSCompositionBuilder().set_patient(mock_patient)
        
        # Add all mandatory sections
        await builder.add_section_async(IPSSections.ALLERGIES, mock_allergies, timezone)
        await builder.add_section_async(IPSSections.MEDICATIONS, mock_medications, timezone)
        await builder.add_section_async(IPSSections.PROBLEMS, mock_conditions, timezone)
        await builder.add_section_async(IPSSections.IMMUNIZATIONS, mock_immunizations, timezone)
        
        sections = builder.build(timezone)
        
        assert len(sections) == 4
        
        # Check LOINC codes for each section
        section_codes = [section['code']['coding'][0]['code'] for section in sections]
        assert IPS_SECTION_LOINC_CODES[IPSSections.ALLERGIES] in section_codes
        assert IPS_SECTION_LOINC_CODES[IPSSections.MEDICATIONS] in section_codes
        assert IPS_SECTION_LOINC_CODES[IPSSections.PROBLEMS] in section_codes
        assert IPS_SECTION_LOINC_CODES[IPSSections.IMMUNIZATIONS] in section_codes

    @pytest.mark.asyncio
    async def test_missing_mandatory_sections_throws_error(
        self, 
        mock_patient: TPatient, 
        mock_allergies: List[Dict[str, Any]]
    ):
        """Test that missing mandatory sections throws an error."""
        timezone = 'America/New_York'
        builder = ComprehensiveIPSCompositionBuilder().set_patient(mock_patient)
        
        # Only add one mandatory section
        await builder.add_section_async(IPSSections.ALLERGIES, mock_allergies, timezone)
        
        with pytest.raises(ValueError, match='Missing mandatory IPS sections'):
            builder.build(timezone)

    @pytest.mark.asyncio
    async def test_create_complete_ips_composition(
        self,
        mock_patient: TPatient,
        mock_allergies: List[Dict[str, Any]],
        mock_medications: List[Dict[str, Any]],
        mock_conditions: List[Dict[str, Any]],
        mock_immunizations: List[Dict[str, Any]]
    ):
        """Test creating a complete IPS composition."""
        timezone = 'America/New_York'
        builder = ComprehensiveIPSCompositionBuilder().set_patient(mock_patient)
        
        # Add all mandatory sections
        await builder.add_section_async(IPSSections.ALLERGIES, mock_allergies, timezone)
        await builder.add_section_async(IPSSections.MEDICATIONS, mock_medications, timezone)
        await builder.add_section_async(IPSSections.PROBLEMS, mock_conditions, timezone)
        await builder.add_section_async(IPSSections.IMMUNIZATIONS, mock_immunizations, timezone)
        
        sections = builder.build(timezone)
        
        assert len(sections) == 4
        
        for section in sections:
            assert 'entry' in section
            assert section['code']['coding'][0]['system'] == 'http://loinc.org'

    @pytest.mark.asyncio
    async def test_create_complete_ips_composition_bundle(
        self,
        mock_patient: TPatient,
        mock_allergies: List[Dict[str, Any]],
        mock_medications: List[Dict[str, Any]],
        mock_conditions: List[Dict[str, Any]],
        mock_immunizations: List[Dict[str, Any]]
    ):
        """Test creating a complete IPS composition bundle."""
        timezone = 'America/New_York'
        builder = ComprehensiveIPSCompositionBuilder().set_patient(mock_patient)
        
        # Add all mandatory sections
        await builder.add_section_async(IPSSections.ALLERGIES, mock_allergies, timezone)
        await builder.add_section_async(IPSSections.MEDICATIONS, mock_medications, timezone)
        await builder.add_section_async(IPSSections.PROBLEMS, mock_conditions, timezone)
        await builder.add_section_async(IPSSections.IMMUNIZATIONS, mock_immunizations, timezone)
        
        bundle = await builder.build_bundle_async(
            'example-organization',
            'Example Organization',
            'https://fhir.icanbwell.com/4_0_0/',
            timezone
        )
        
        # Basic bundle structure checks
        assert bundle['resourceType'] == 'Bundle'
        assert bundle['type'] == 'document'
        assert 'entry' in bundle
        assert len(bundle['entry']) > 0
        
        # First entry should be the Composition resource
        composition = bundle['entry'][0]['resource']
        assert composition['resourceType'] == 'Composition'
        assert composition['type']['coding'][0]['system'] == 'http://loinc.org'
        assert composition['type']['coding'][0]['code'] == '60591-5'  # LOINC code for IPS
        assert composition['subject']['reference'] == f"Patient/{mock_patient['id']}"
        
        # Check that sections are present in the composition
        assert 'section' in composition
        assert len(composition['section']) > 0
        
        # Check that there is NOT a patient section (patient is handled separately)
        patient_section = None
        for section in composition['section']:
            if section['code']['coding'][0]['code'] == IPS_SECTION_LOINC_CODES[IPSSections.PATIENT]:
                patient_section = section
                break
        assert patient_section is None
        
        # Check that medication section exists
        medication_section = None
        for section in composition['section']:
            if section['code']['coding'][0]['code'] == IPS_SECTION_LOINC_CODES[IPSSections.MEDICATIONS]:
                medication_section = section
                break
        assert medication_section is not None
        
        # Check that condition section exists
        condition_section = None
        for section in composition['section']:
            if section['code']['coding'][0]['code'] == IPS_SECTION_LOINC_CODES[IPSSections.PROBLEMS]:
                condition_section = section
                break
        assert condition_section is not None
        
        # Check total number of entries (Composition + Patient + resources + Organization)
        # Should be: 1 Composition + 1 Patient + resources count + 1 Organization
        expected_entries = 1 + 1 + len(mock_allergies) + len(mock_medications) + len(mock_conditions) + len(mock_immunizations) + 1
        assert len(bundle['entry']) == expected_entries
        
        # Check that each entry has a valid resource type
        for entry in bundle['entry'][1:]:  # Skip composition
            resource = entry['resource']
            assert 'resourceType' in resource


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
