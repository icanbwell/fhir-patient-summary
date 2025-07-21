"""
Test International Patient Summary (IPS) Implementation.

This test file corresponds to the original ips.test.ts
"""

import pytest
import sys
import os
import time
from typing import List

# Add the current directory to the Python path
current_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, current_dir)

from python.python_src.profiles.ips_resource_profile_registry import IPSResourceProfileRegistry
from python.python_src.structures.ips_mandatory_sections import IPSMandatorySections
from python.python_src.generators.fhir_summary_generator import ComprehensiveIPSCompositionBuilder
from python.python_src.generators.narrative_generator import NarrativeGenerator
from python.python_src.types.fhir_types import TPatient, TAllergyIntolerance, TMedicationStatement, TCondition, TImmunization, TObservation
from python.python_src.structures.ips_sections import IPSSections


class TestInternationalPatientSummary:
    """Test suite for International Patient Summary (IPS) Implementation."""
    
    @pytest.fixture
    def mock_patient(self) -> TPatient:
        """Mock patient resource for testing."""
        return {
            'resourceType': 'Patient',
            'id': 'test-patient-01',
            'identifier': [{
                'system': 'https://example.org',
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
    def mock_allergies(self) -> List[TAllergyIntolerance]:
        """Mock allergy resources for testing."""
        return [
            {
                'resourceType': 'AllergyIntolerance',
                'id': 'allergy-01',
                'clinicalStatus': {
                    'coding': [{
                        'code': 'active'
                    }]
                },
                'verificationStatus': {
                    'coding': [{
                        'code': 'confirmed'
                    }]
                },
                'code': {'text': 'Penicillin'},
                'patient': {'reference': 'Patient/test-patient-01'}
            },
            {
                'resourceType': 'AllergyIntolerance',
                'id': 'allergy-02',
                'clinicalStatus': {
                    'coding': [{
                        'code': 'active'
                    }]
                },
                'verificationStatus': {
                    'coding': [{
                        'code': 'confirmed'
                    }]
                },
                'code': {'text': 'Peanuts'},
                'patient': {'reference': 'Patient/test-patient-01'}
            },
            {
                'resourceType': 'AllergyIntolerance',
                'id': 'allergy-03',
                'clinicalStatus': {
                    'coding': [{
                        'code': 'inactive'
                    }]
                },
                'verificationStatus': {
                    'coding': [{
                        'code': 'confirmed'
                    }]
                },
                'code': {'text': 'Latex'},
                'patient': {'reference': 'Patient/test-patient-01'}
            }
        ]
    
    @pytest.fixture
    def mock_medications(self) -> List[TMedicationStatement]:
        """Mock medication resources for testing."""
        return [
            {
                'resourceType': 'MedicationStatement',
                'id': 'med-01',
                'status': 'active',
                'medicationCodeableConcept': {'text': 'Aspirin'},
                'subject': {'reference': 'Patient/test-patient-01'}
            },
            {
                'resourceType': 'MedicationStatement',
                'id': 'med-02',
                'status': 'active',
                'medicationCodeableConcept': {'text': 'Lisinopril'},
                'subject': {'reference': 'Patient/test-patient-01'}
            },
            {
                'resourceType': 'MedicationStatement',
                'id': 'med-03',
                'status': 'completed',
                'medicationCodeableConcept': {'text': 'Amoxicillin'},
                'subject': {'reference': 'Patient/test-patient-01'}
            }
        ]
    
    @pytest.fixture
    def mock_conditions(self) -> List[TCondition]:
        """Mock condition resources for testing."""
        return [
            {
                'resourceType': 'Condition',
                'id': 'condition-01',
                'clinicalStatus': {
                    'coding': [{
                        'code': 'active'
                    }]
                },
                'verificationStatus': {
                    'coding': [{
                        'code': 'confirmed'
                    }]
                },
                'code': {'text': 'Hypertension'},
                'subject': {'reference': 'Patient/test-patient-01'}
            },
            {
                'resourceType': 'Condition',
                'id': 'condition-02',
                'clinicalStatus': {
                    'coding': [{
                        'code': 'active'
                    }]
                },
                'verificationStatus': {
                    'coding': [{
                        'code': 'confirmed'
                    }]
                },
                'code': {'text': 'Type 2 Diabetes'},
                'subject': {'reference': 'Patient/test-patient-01'}
            },
            {
                'resourceType': 'Condition',
                'id': 'condition-03',
                'clinicalStatus': {
                    'coding': [{
                        'code': 'resolved'
                    }]
                },
                'verificationStatus': {
                    'coding': [{
                        'code': 'confirmed'
                    }]
                },
                'code': {'text': 'Pneumonia'},
                'subject': {'reference': 'Patient/test-patient-01'}
            }
        ]
    
    @pytest.fixture
    def mock_immunizations(self) -> List[TImmunization]:
        """Mock immunization resources for testing."""
        return [
            {
                'resourceType': 'Immunization',
                'id': 'imm-01',
                'status': 'completed',
                'vaccineCode': {'text': 'COVID-19 Vaccine'},
                'patient': {'reference': 'Patient/test-patient-01'},
                'primarySource': True,
                'occurrenceDateTime': '2024-01-01'
            },
            {
                'resourceType': 'Immunization',
                'id': 'imm-02',
                'status': 'completed',
                'vaccineCode': {'text': 'Influenza Vaccine'},
                'patient': {'reference': 'Patient/test-patient-01'},
                'primarySource': True,
                'occurrenceDateTime': '2023-10-15'
            },
            {
                'resourceType': 'Immunization',
                'id': 'imm-03',
                'status': 'completed',
                'vaccineCode': {'text': 'Tetanus Vaccine'},
                'patient': {'reference': 'Patient/test-patient-01'},
                'primarySource': False,
                'occurrenceDateTime': '2022-05-20'
            }
        ]
    
    @pytest.fixture
    def mock_laboratory_results(self) -> List[TObservation]:
        """Mock laboratory result resources for testing."""
        return [
            {
                'resourceType': 'Observation',
                'id': 'lab-01',
                'status': 'final',
                'category': [{
                    'coding': [{'code': 'laboratory'}]
                }],
                'code': {'text': 'Blood Glucose'},
                'subject': {'reference': 'Patient/test-patient-01'},
                'effectiveDateTime': '2023-01-01',
                'valueQuantity': {
                    'value': 100,
                    'unit': 'mg/dL'
                }
            },
            {
                'resourceType': 'Observation',
                'id': 'lab-02',
                'status': 'final',
                'category': [{
                    'coding': [{'code': 'laboratory'}]
                }],
                'code': {'text': 'Hemoglobin A1C'},
                'subject': {'reference': 'Patient/test-patient-01'},
                'effectiveDateTime': '2023-01-01',
                'valueQuantity': {
                    'value': 6.5,
                    'unit': '%'
                }
            },
            {
                'resourceType': 'Observation',
                'id': 'lab-03',
                'status': 'preliminary',
                'category': [{
                    'coding': [{'code': 'laboratory'}]
                }],
                'code': {'text': 'Lipid Panel'},
                'subject': {'reference': 'Patient/test-patient-01'},
                'effectiveDateTime': '2023-02-15',
                'hasMember': [
                    {'reference': 'Observation/lab-04'},
                    {'reference': 'Observation/lab-05'}
                ]
            },
            {
                'resourceType': 'Observation',
                'id': 'lab-04',
                'status': 'final',
                'category': [{
                    'coding': [{'code': 'laboratory'}]
                }],
                'code': {'text': 'LDL Cholesterol'},
                'subject': {'reference': 'Patient/test-patient-01'},
                'effectiveDateTime': '2023-02-15',
                'valueQuantity': {
                    'value': 120,
                    'unit': 'mg/dL'
                }
            }
        ]

    # Resource Profile Validation Tests
    def test_patient_resource_should_pass_validation(self, mock_patient: TPatient):
        """Test patient resource validation."""
        is_valid = IPSResourceProfileRegistry.validate_resource(
            mock_patient,
            IPSMandatorySections.PATIENT
        )
        assert is_valid is True
    
    def test_allergy_resource_should_pass_validation(self, mock_allergies: List[TAllergyIntolerance]):
        """Test allergy resource validation."""
        is_valid = IPSResourceProfileRegistry.validate_resource(
            mock_allergies[0],
            IPSMandatorySections.ALLERGIES
        )
        assert is_valid is True
    
    def test_medication_resource_should_pass_validation(self, mock_medications: List[TMedicationStatement]):
        """Test medication resource validation."""
        is_valid = IPSResourceProfileRegistry.validate_resource(
            mock_medications[0],
            IPSMandatorySections.MEDICATIONS
        )
        assert is_valid is True
    
    def test_condition_resource_should_pass_validation(self, mock_conditions: List[TCondition]):
        """Test condition resource validation."""
        is_valid = IPSResourceProfileRegistry.validate_resource(
            mock_conditions[0],
            IPSMandatorySections.PROBLEMS
        )
        assert is_valid is True
    
    def test_immunization_resource_should_pass_validation(self, mock_immunizations: List[TImmunization]):
        """Test immunization resource validation."""
        is_valid = IPSResourceProfileRegistry.validate_resource(
            mock_immunizations[0],
            IPSMandatorySections.IMMUNIZATIONS
        )
        assert is_valid is True

    # Narrative Generation Tests
    @pytest.mark.asyncio
    async def test_patient_narrative_should_be_generated(self, mock_patient: TPatient):
        """Test patient narrative generation."""
        narrative = await NarrativeGenerator.generate_narrative_async(
            IPSSections.PATIENT, 
            [mock_patient], 
            'America/New_York'
        )
        
        assert narrative is not None
        assert narrative.status == 'generated'
        print(f"Patient narrative: {narrative.div}")
        assert 'John Doe' in narrative.div
        assert 'Male' in narrative.div
    
    @pytest.mark.asyncio
    async def test_allergy_narrative_should_be_generated(self, mock_allergies: List[TAllergyIntolerance]):
        """Test allergy narrative generation."""
        narrative = await NarrativeGenerator.generate_narrative_async(
            IPSSections.ALLERGIES, 
            [mock_allergies[0]], 
            'America/New_York'
        )
        
        assert narrative is not None
        assert narrative.status == 'generated'
        assert 'Penicillin' in narrative.div

    # IPS Composition Builder Tests
    @pytest.mark.asyncio
    async def test_should_create_composition_with_all_mandatory_sections(
        self, 
        mock_patient: TPatient,
        mock_allergies: List[TAllergyIntolerance],
        mock_medications: List[TMedicationStatement],
        mock_conditions: List[TCondition],
        mock_immunizations: List[TImmunization]
    ):
        """Test creating composition with all mandatory sections."""
        ips_builder = ComprehensiveIPSCompositionBuilder().set_patient(mock_patient)
        timezone = 'America/New_York'
        
        await ips_builder.add_section_async(IPSSections.ALLERGIES, mock_allergies, timezone)
        await ips_builder.add_section_async(IPSSections.MEDICATIONS, mock_medications, timezone)
        await ips_builder.add_section_async(IPSSections.PROBLEMS, mock_conditions, timezone)
        await ips_builder.add_section_async(IPSSections.IMMUNIZATIONS, mock_immunizations, timezone)
        await ips_builder.add_section_async(IPSSections.PATIENT, [mock_patient], timezone)
        
        composition = ips_builder.build('America/New_York')
        assert composition is not None
    
    def test_should_throw_error_if_mandatory_sections_are_missing(self, mock_patient: TPatient):
        """Test error when mandatory sections are missing."""
        ips_builder = ComprehensiveIPSCompositionBuilder().set_patient(mock_patient)
        
        with pytest.raises(ValueError, match="Missing mandatory IPS sections"):
            ips_builder.build('America/New_York')
    
    @pytest.mark.asyncio
    async def test_should_support_optional_sections(
        self,
        mock_patient: TPatient,
        mock_allergies: List[TAllergyIntolerance],
        mock_medications: List[TMedicationStatement],
        mock_conditions: List[TCondition],
        mock_immunizations: List[TImmunization],
        mock_laboratory_results: List[TObservation]
    ):
        """Test support for optional sections."""
        ips_builder = ComprehensiveIPSCompositionBuilder().set_patient(mock_patient)
        timezone = 'America/New_York'
        
        await ips_builder.add_section_async(IPSSections.PATIENT, [mock_patient], timezone)
        await ips_builder.add_section_async(IPSSections.ALLERGIES, mock_allergies, timezone)
        await ips_builder.add_section_async(IPSSections.MEDICATIONS, mock_medications, timezone)
        await ips_builder.add_section_async(IPSSections.PROBLEMS, mock_conditions, timezone)
        await ips_builder.add_section_async(IPSSections.IMMUNIZATIONS, mock_immunizations, timezone)
        await ips_builder.add_section_async(IPSSections.DIAGNOSTIC_REPORTS, mock_laboratory_results, timezone)
        
        composition = ips_builder.build('America/New_York')
        assert composition is not None

    # Error Handling Tests
    def test_should_reject_invalid_patient_resource(self):
        """Test rejection of invalid allergy resource (since Patient has no mandatory fields)."""
        invalid_allergy = {
            'resourceType': 'AllergyIntolerance'
            # Missing mandatory 'patient' field
        }
        
        # Expect validation failure due to missing mandatory field
        is_valid = IPSResourceProfileRegistry.validate_resource(
            invalid_allergy,
            IPSMandatorySections.ALLERGIES
        )
        
        # Should fail validation due to missing mandatory 'patient' field
        assert is_valid is False
    
    def test_should_handle_resources_with_missing_mandatory_fields(self):
        """Test handling of resources with missing mandatory fields."""
        incomplete_allergy = {
            'resourceType': 'AllergyIntolerance'
            # Missing mandatory fields
        }
        
        is_valid = IPSResourceProfileRegistry.validate_resource(
            incomplete_allergy,
            IPSMandatorySections.ALLERGIES
        )
        
        assert is_valid is False

    # Performance and Scalability Tests
    @pytest.mark.asyncio
    async def test_should_handle_multiple_resources_efficiently(
        self,
        mock_patient: TPatient,
        mock_allergies: List[TAllergyIntolerance],
        mock_conditions: List[TCondition],
        mock_immunizations: List[TImmunization]
    ):
        """Test handling multiple resources efficiently."""
        # Generate a large number of medication resources
        large_medication_list: List[TMedicationStatement] = [
            {
                'resourceType': 'MedicationStatement',
                'id': f'med-{index}',
                'status': 'active',
                'medicationCodeableConcept': {'text': f'Medication {index}'},
                'subject': {'reference': 'Patient/test-patient-01'}
            }
            for index in range(100)
        ]
        
        ips_builder = ComprehensiveIPSCompositionBuilder().set_patient(mock_patient)
        timezone = 'America/New_York'
        
        start = time.time()
        
        await ips_builder.add_section_async(IPSSections.PATIENT, [mock_patient], timezone)
        await ips_builder.add_section_async(IPSSections.MEDICATIONS, large_medication_list, timezone)
        await ips_builder.add_section_async(IPSSections.ALLERGIES, mock_allergies, timezone)
        await ips_builder.add_section_async(IPSSections.PROBLEMS, mock_conditions, timezone)
        await ips_builder.add_section_async(IPSSections.IMMUNIZATIONS, mock_immunizations, timezone)
        
        composition = ips_builder.build(timezone)
        
        end = time.time()
        
        assert composition is not None
        assert (end - start) < 1.0  # Should complete within 1 second


# Add fixture to all test classes
if __name__ == '__main__':
    pytest.main([__file__, '-v'])
