import AllergyIntolerance = fhir.AllergyIntolerance;
import MedicationStatement = fhir.MedicationStatement;
import Condition = fhir.Condition;
import Immunization = fhir.Immunization;
import Observation = fhir.Observation;
import {IPSResourceProfileRegistry} from "../src/ips_resource_profile_registry";
import {IPSMandatorySections} from "../src/ips_mandatory_sections";
import {ComprehensiveIPSCompositionBuilder} from "../src/fhir_summary_generator";
import {IPSRecommendedSections} from "../src/ips_recommended_sections";
import Patient = fhir.Patient;
import {NarrativeGenerator} from "../src/narrative_generator";

describe('International Patient Summary (IPS) Implementation', () => {
    // Mock Resources for Testing
    const mockPatient: Patient = {
        resourceType: 'Patient',
        id: 'test-patient-01',
        identifier: [{
            system: 'http://example.org',
            value: '12345'
        }],
        name: [{
            family: 'Doe',
            given: ['John']
        }],
        gender: 'male',
        birthDate: '1980-01-01'
    };

    const mockAllergies: AllergyIntolerance[] = [
        {
            resourceType: 'AllergyIntolerance',
            id: 'allergy-01',
            clinicalStatus: 'active',
            verificationStatus: 'confirmed',
            code: {text: 'Penicillin'},
            patient: {reference: 'Patient/test-patient-01'}
        }
    ];

    const mockMedications: MedicationStatement[] = [
        {
            resourceType: 'MedicationStatement',
            id: 'med-01',
            status: 'active',
            medicationCodeableConcept: {text: 'Aspirin'},
            subject: {reference: 'Patient/test-patient-01'},
            taken: 'y'
        }
    ];

    const mockConditions: Condition[] = [
        {
            resourceType: 'Condition',
            id: 'condition-01',
            clinicalStatus:  'active',
            verificationStatus: 'confirmed',
            code: {text: 'Hypertension'},
            subject: {reference: 'Patient/test-patient-01'}
        }
    ];

    const mockImmunizations: Immunization[] = [
        {
            resourceType: 'Immunization',
            id: 'imm-01',
            status: 'completed',
            vaccineCode: {text: 'COVID-19 Vaccine'},
            patient: {reference: 'Patient/test-patient-01'},
            notGiven: false,
            primarySource: true,
        }
    ];

    const mockLaboratoryResults: Observation[] = [
        {
            resourceType: 'Observation',
            id: 'lab-01',
            status: 'final',
            category: [{
                coding: [{code: 'laboratory'}]
            }],
            code: {text: 'Blood Glucose'},
            subject: {reference: 'Patient/test-patient-01'},
            effectiveDateTime: '2023-01-01',
            valueQuantity: {
                value: 100,
                unit: 'mg/dL'
            }
        }
    ];

    // Resource Profile Validation Tests
    describe('Resource Profile Validation', () => {
        test('Patient resource should pass validation', () => {
            const isValid = IPSResourceProfileRegistry.validateResource(
                mockPatient,
                IPSMandatorySections.PATIENT
            );
            expect(isValid).toBe(true);
        });

        test('Allergy resource should pass validation', () => {
            const isValid = IPSResourceProfileRegistry.validateResource(
                mockAllergies[0],
                IPSMandatorySections.ALLERGIES
            );
            expect(isValid).toBe(true);
        });

        test('Medication resource should pass validation', () => {
            const isValid = IPSResourceProfileRegistry.validateResource(
                mockMedications[0],
                IPSMandatorySections.MEDICATIONS
            );
            expect(isValid).toBe(true);
        });

        test('Condition resource should pass validation', () => {
            const isValid = IPSResourceProfileRegistry.validateResource(
                mockConditions[0],
                IPSMandatorySections.PROBLEMS
            );
            expect(isValid).toBe(true);
        });

        test('Immunization resource should pass validation', () => {
            const isValid = IPSResourceProfileRegistry.validateResource(
                mockImmunizations[0],
                IPSMandatorySections.IMMUNIZATIONS
            );
            expect(isValid).toBe(true);
        });
    });

    // Narrative Generation Tests
    describe('Narrative Generation', () => {
        test('Patient narrative should be generated', () => {
            const narrative = NarrativeGenerator.generateNarrative(mockPatient);

            expect(narrative).toBeDefined();
            expect(narrative.status).toBe('generated');
            expect(narrative.div).toContain('John Doe');
            expect(narrative.div).toContain('Gender: male');
        });

        test('Allergy narrative should be generated', () => {
            const narrative = NarrativeGenerator.generateNarrative(mockAllergies[0]);

            expect(narrative).toBeDefined();
            expect(narrative.status).toBe('generated');
            expect(narrative.div).toContain('Penicillin');
        });
    });

    // Composition Builder Tests
    describe('IPS Composition Builder', () => {
        test('Should create composition with all mandatory sections', () => {
            const ipsBuilder = new ComprehensiveIPSCompositionBuilder(mockPatient);

            const buildIPS = () => {
                ipsBuilder
                    .addSection(IPSMandatorySections.ALLERGIES, mockAllergies)
                    .addSection(IPSMandatorySections.MEDICATIONS, mockMedications)
                    .addSection(IPSMandatorySections.PROBLEMS, mockConditions)
                    .addSection(IPSMandatorySections.IMMUNIZATIONS, mockImmunizations)
                    .build();
            };

            expect(buildIPS).not.toThrow();
        });

        test('Should throw error if mandatory sections are missing', () => {
            const ipsBuilder = new ComprehensiveIPSCompositionBuilder(mockPatient);

            const buildInvalidIPS = () => {
                ipsBuilder.build();
            };

            expect(buildInvalidIPS).toThrow('Missing mandatory IPS sections');
        });

        test('Should support optional sections', () => {
            const ipsBuilder = new ComprehensiveIPSCompositionBuilder(mockPatient);

            const buildFullIPS = () => {
                ipsBuilder
                    .addSection(IPSMandatorySections.ALLERGIES, mockAllergies)
                    .addSection(IPSMandatorySections.MEDICATIONS, mockMedications)
                    .addSection(IPSMandatorySections.PROBLEMS, mockConditions)
                    .addSection(IPSMandatorySections.IMMUNIZATIONS, mockImmunizations)
                    .addSection(IPSRecommendedSections.LABORATORY_RESULTS, mockLaboratoryResults)
                    .build();
            };

            expect(buildFullIPS).not.toThrow();
        });
    });

    // Error Handling Tests
    describe('Error Handling', () => {
        test('Should reject invalid patient resource', () => {
            const invalidPatient = {
                resourceType: 'Patient'
                // Missing mandatory fields
            };

            expect(() => {
                IPSResourceProfileRegistry.validateResource(
                    invalidPatient,
                    IPSMandatorySections.PATIENT
                );
            }).toBeTruthy(); // Expect some form of validation failure
        });

        test('Should handle resources with missing mandatory fields', () => {
            // @ts-expect-error Missing mandatory fields
            const incompleteAllergy: AllergyIntolerance = {
                resourceType: 'AllergyIntolerance'
                // Missing mandatory fields
            };

            const isValid = IPSResourceProfileRegistry.validateResource(
                incompleteAllergy,
                IPSMandatorySections.ALLERGIES
            );

            expect(isValid).toBe(false);
        });
    });

    // Performance and Scalability Tests
    describe('Performance Considerations', () => {
        test('Should handle multiple resources efficiently', () => {
            // Generate a large number of resources
            const largeMedicationList: MedicationStatement[] = Array.from(
                {length: 100},
                (_, index) => ({
                    resourceType: 'MedicationStatement',
                    id: `med-${index}`,
                    status: 'active',
                    medicationCodeableConcept: {text: `Medication ${index}`},
                    subject: {reference: 'Patient/test-patient-01'},
                    taken: 'y'
                })
            );

            const ipsBuilder = new ComprehensiveIPSCompositionBuilder(mockPatient);

            const buildLargeIPS = () => {
                ipsBuilder
                    .addSection(IPSMandatorySections.MEDICATIONS, largeMedicationList)
                    .addSection(IPSMandatorySections.ALLERGIES, mockAllergies)
                    .addSection(IPSMandatorySections.PROBLEMS, mockConditions)
                    .addSection(IPSMandatorySections.IMMUNIZATIONS, mockImmunizations)
                    .build();
            };

            const start = performance.now();
            buildLargeIPS();
            const end = performance.now();

            expect(end - start).toBeLessThan(100); // Expect processing under 100ms
        });
    });
});