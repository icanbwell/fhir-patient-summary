import {IPSResourceProfileRegistry} from "../../src/profiles/ips_resource_profile_registry";
import {IPSMandatorySections} from "../../src/structures/ips_mandatory_sections";
import {ComprehensiveIPSCompositionBuilder} from "../../src/generators/fhir_summary_generator";
import {NarrativeGenerator} from "../../src/generators/narrative_generator";
import {TPatient} from "../../src/types/resources/Patient";
import {TAllergyIntolerance} from "../../src/types/resources/AllergyIntolerance";
import {TMedicationStatement} from "../../src/types/resources/MedicationStatement";
import {TCondition} from "../../src/types/resources/Condition";
import {TImmunization} from "../../src/types/resources/Immunization";
import {TObservation} from "../../src/types/resources/Observation";
import {IPSSections} from "../../src/structures/ips_sections";

describe('International Patient Summary (IPS) Implementation', () => {
    // Mock Resources for Testing
    const mockPatient: TPatient = {
        resourceType: 'Patient',
        id: 'test-patient-01',
        identifier: [{
            system: 'https://example.org',
            value: '12345'
        }],
        name: [{
            family: 'Doe',
            given: ['John']
        }],
        gender: 'male',
        birthDate: '1980-01-01'
    };

    const mockAllergies: TAllergyIntolerance[] = [
        {
            resourceType: 'AllergyIntolerance',
            id: 'allergy-01',
            clinicalStatus: {
                coding: [
                    {
                        code: 'active'
                    }
                ]
            },
            verificationStatus: {
                coding: [
                    {
                        code: 'confirmed'
                    }
                ]
            },
            code: {text: 'Penicillin'},
            patient: {reference: 'Patient/test-patient-01'}
        },
        {
            resourceType: 'AllergyIntolerance',
            id: 'allergy-02',
            clinicalStatus: {
                coding: [
                    {
                        code: 'active'
                    }
                ]
            },
            verificationStatus: {
                coding: [
                    {
                        code: 'confirmed'
                    }
                ]
            },
            code: {text: 'Peanuts'},
            patient: {reference: 'Patient/test-patient-01'}
        },
        {
            resourceType: 'AllergyIntolerance',
            id: 'allergy-03',
            clinicalStatus: {
                coding: [
                    {
                        code: 'inactive'
                    }
                ]
            },
            verificationStatus: {
                coding: [
                    {
                        code: 'confirmed'
                    }
                ]
            },
            code: {text: 'Latex'},
            patient: {reference: 'Patient/test-patient-01'}
        }
    ];

    const mockMedications: TMedicationStatement[] = [
        {
            resourceType: 'MedicationStatement',
            id: 'med-01',
            status: 'active',
            medicationCodeableConcept: {text: 'Aspirin'},
            subject: {reference: 'Patient/test-patient-01'}
        },
        {
            resourceType: 'MedicationStatement',
            id: 'med-02',
            status: 'active',
            medicationCodeableConcept: {text: 'Lisinopril'},
            subject: {reference: 'Patient/test-patient-01'}
        },
        {
            resourceType: 'MedicationStatement',
            id: 'med-03',
            status: 'completed',
            medicationCodeableConcept: {text: 'Amoxicillin'},
            subject: {reference: 'Patient/test-patient-01'},
        }
    ];

    const mockConditions: TCondition[] = [
        {
            resourceType: 'Condition',
            id: 'condition-01',
            clinicalStatus: {
                coding: [
                    {
                        code: 'active'
                    }
                ]
            },
            verificationStatus: {
                coding: [
                    {
                        code: 'confirmed'
                    }
                ]
            },
            code: {text: 'Hypertension'},
            subject: {reference: 'Patient/test-patient-01'}
        },
        {
            resourceType: 'Condition',
            id: 'condition-02',
            clinicalStatus: {
                coding: [
                    {
                        code: 'active'
                    }
                ]
            },
            verificationStatus: {
                coding: [
                    {
                        code: 'confirmed'
                    }
                ]
            },
            code: {text: 'Type 2 Diabetes'},
            subject: {reference: 'Patient/test-patient-01'}
        },
        {
            resourceType: 'Condition',
            id: 'condition-03',
            clinicalStatus: {
                coding: [
                    {
                        code: 'resolved'
                    }
                ]
            },
            verificationStatus: {
                coding: [
                    {
                        code: 'confirmed'
                    }
                ]
            },
            code: {text: 'Pneumonia'},
            subject: {reference: 'Patient/test-patient-01'}
        }
    ];

    const mockImmunizations: TImmunization[] = [
        {
            resourceType: 'Immunization',
            id: 'imm-01',
            status: 'completed',
            vaccineCode: {text: 'COVID-19 Vaccine'},
            patient: {reference: 'Patient/test-patient-01'},
            primarySource: true,
            occurrenceDateTime: '2024-01-01'
        },
        {
            resourceType: 'Immunization',
            id: 'imm-02',
            status: 'completed',
            vaccineCode: {text: 'Influenza Vaccine'},
            patient: {reference: 'Patient/test-patient-01'},
            primarySource: true,
            occurrenceDateTime: '2023-10-15'
        },
        {
            resourceType: 'Immunization',
            id: 'imm-03',
            status: 'completed',
            vaccineCode: {text: 'Tetanus Vaccine'},
            patient: {reference: 'Patient/test-patient-01'},
            primarySource: false,
            occurrenceDateTime: '2022-05-20'
        }
    ];

    const mockLaboratoryResults: TObservation[] = [
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
        },
        {
            resourceType: 'Observation',
            id: 'lab-02',
            status: 'final',
            category: [{
                coding: [{code: 'laboratory'}]
            }],
            code: {text: 'Hemoglobin A1C'},
            subject: {reference: 'Patient/test-patient-01'},
            effectiveDateTime: '2023-01-01',
            valueQuantity: {
                value: 6.5,
                unit: '%'
            }
        },
        {
            resourceType: 'Observation',
            id: 'lab-03',
            status: 'preliminary',
            category: [{
                coding: [{code: 'laboratory'}]
            }],
            code: {text: 'Lipid Panel'},
            subject: {reference: 'Patient/test-patient-01'},
            effectiveDateTime: '2023-02-15',
            hasMember: [
                {reference: 'Observation/lab-04'},
                {reference: 'Observation/lab-05'}
            ]
        },
        {
            resourceType: 'Observation',
            id: 'lab-04',
            status: 'final',
            category: [{
                coding: [{code: 'laboratory'}]
            }],
            code: {text: 'LDL Cholesterol'},
            subject: {reference: 'Patient/test-patient-01'},
            effectiveDateTime: '2023-02-15',
            valueQuantity: {
                value: 120,
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
            const narrative = NarrativeGenerator.generateNarrative(IPSSections.PATIENT, [mockPatient], 'America/New_York');

            expect(narrative).toBeDefined();
            expect(narrative?.status).toBe('generated');
            console.info(narrative?.div);
            expect(narrative?.div).toContain('John Doe');
            expect(narrative?.div).toContain('Male');
        });

        test('Allergy narrative should be generated', () => {
            const narrative = NarrativeGenerator.generateNarrative(IPSSections.ALLERGIES, [mockAllergies[0]], 'America/New_York');

            expect(narrative).toBeDefined();
            expect(narrative?.status).toBe('generated');
            expect(narrative?.div).toContain('Penicillin');
        });
    });

    // Composition Builder Tests
    describe('IPS Composition Builder', () => {
        test('Should create composition with all mandatory sections', () => {
            const ipsBuilder = new ComprehensiveIPSCompositionBuilder().setPatient(mockPatient);

            const buildIPS = () => {
                const timezone = 'America/New_York';
                ipsBuilder
                    .addSection(IPSSections.ALLERGIES, mockAllergies, timezone)
                    .addSection(IPSSections.MEDICATIONS, mockMedications, timezone)
                    .addSection(IPSSections.PROBLEMS, mockConditions, timezone)
                    .addSection(IPSSections.IMMUNIZATIONS, mockImmunizations, timezone)
                    .addSection(IPSSections.PATIENT, [mockPatient], timezone)
                    .build('America/New_York');
            };

            expect(buildIPS).not.toThrow();
        });

        test('Should throw error if mandatory sections are missing', () => {
            const ipsBuilder = new ComprehensiveIPSCompositionBuilder().setPatient(mockPatient);

            const buildInvalidIPS = () => {
                ipsBuilder.build('America/New_York');
            };

            expect(buildInvalidIPS).toThrow('Missing mandatory IPS sections');
        });

        test('Should support optional sections', () => {
            const ipsBuilder = new ComprehensiveIPSCompositionBuilder().setPatient(mockPatient);

            const buildFullIPS = () => {
                ipsBuilder
                    .addSection(IPSSections.PATIENT, [mockPatient], 'America/New_York')
                    .addSection(IPSSections.ALLERGIES, mockAllergies, 'America/New_York')
                    .addSection(IPSSections.MEDICATIONS, mockMedications, 'America/New_York')
                    .addSection(IPSSections.PROBLEMS, mockConditions, 'America/New_York')
                    .addSection(IPSSections.IMMUNIZATIONS, mockImmunizations, 'America/New_York')
                    .addSection(IPSSections.DIAGNOSTIC_REPORTS, mockLaboratoryResults, 'America/New_York')
                    .build('America/New_York');
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
            const largeMedicationList: TMedicationStatement[] = Array.from(
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

            const ipsBuilder = new ComprehensiveIPSCompositionBuilder().setPatient(mockPatient);

            const buildLargeIPS = () => {
                ipsBuilder
                    .addSection(IPSSections.PATIENT, [mockPatient], 'America/New_York')
                    .addSection(IPSSections.MEDICATIONS, largeMedicationList, 'America/New_York')
                    .addSection(IPSSections.ALLERGIES, mockAllergies, 'America/New_York')
                    .addSection(IPSSections.PROBLEMS, mockConditions, 'America/New_York')
                    .addSection(IPSSections.IMMUNIZATIONS, mockImmunizations, 'America/New_York')
                    .build('America/New_York');
            };

            const start = performance.now();
            buildLargeIPS();
            const end = performance.now();

            expect(end - start).toBeLessThan(100); // Expect processing under 100ms
        });
    });
});