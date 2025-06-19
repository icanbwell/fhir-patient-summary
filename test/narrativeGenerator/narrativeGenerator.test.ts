/* eslint-disable @typescript-eslint/no-unused-vars */
import * as path from 'path';
import {TPatient} from '../../src/types/resources/Patient';
import {TAllergyIntolerance} from '../../src/types/resources/AllergyIntolerance';
import {TMedicationStatement} from '../../src/types/resources/MedicationStatement';
import {TCondition} from '../../src/types/resources/Condition';
import {TImmunization} from '../../src/types/resources/Immunization';
import {TObservation} from '../../src/types/resources/Observation';
import {NarrativeGenerator} from '../../src/generators/narrative_generator';
import {IPSSections} from '../../src/structures/ips_sections';
import {IPS_SECTION_DISPLAY_NAMES, IPS_SECTION_LOINC_CODES} from "../../src/structures/ips_section_loinc_codes";
import {compareNarratives, readNarrativeFile} from "../utilities/testHelpers";

describe('Narrative Generator Tests', () => {
    // Mock Resources for Testing
    const mockPatient: TPatient = {
        resourceType: 'Patient',
        id: 'test-patient-01',
        identifier: [{system: 'https://example.org', value: '12345'}],
        name: [{family: 'Doe', given: ['John']}],
        gender: 'male',
        birthDate: '1980-01-01'
    };
    const mockAllergies: TAllergyIntolerance[] = [
        {
            resourceType: 'AllergyIntolerance',
            id: 'allergy-01',
            clinicalStatus: {coding: [{code: 'active'}]},
            verificationStatus: {coding: [{code: 'confirmed'}]},
            code: {text: 'Penicillin'},
            patient: {reference: 'Patient/test-patient-01'}
        },
        {
            resourceType: 'AllergyIntolerance',
            id: 'allergy-02',
            clinicalStatus: {coding: [{code: 'active'}]},
            verificationStatus: {coding: [{code: 'confirmed'}]},
            code: {text: 'Peanuts'},
            patient: {reference: 'Patient/test-patient-01'},
            reaction: [
                {
                    manifestation: [
                        {text: 'Anaphylaxis'}
                    ],
                    severity: 'severe'
                }
            ]
        },
        {
            resourceType: 'AllergyIntolerance',
            id: 'allergy-03',
            clinicalStatus: {coding: [{code: 'inactive'}]},
            verificationStatus: {coding: [{code: 'confirmed'}]},
            code: {text: 'Latex'},
            patient: {reference: 'Patient/test-patient-01'},
            reaction: [
                {
                    manifestation: [
                        {text: 'Skin rash'}
                    ],
                    severity: 'moderate'
                }
            ]
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
            subject: {reference: 'Patient/test-patient-01'},
            dosage: [
                {
                    text: '10mg daily',
                    timing: {
                        repeat: {
                            frequency: 1,
                            period: 1,
                            periodUnit: 'd'
                        }
                    }
                }
            ]
        },
        {
            resourceType: 'MedicationStatement',
            id: 'med-03',
            status: 'completed',
            medicationCodeableConcept: {text: 'Amoxicillin'},
            subject: {reference: 'Patient/test-patient-01'},
            dosage: [
                {
                    text: '500mg three times daily',
                    timing: {
                        repeat: {
                            frequency: 3,
                            period: 1,
                            periodUnit: 'd'
                        }
                    }
                }
            ],
            effectivePeriod: {
                start: '2023-12-01',
                end: '2023-12-10'
            }
        }
    ];
    const mockConditions: TCondition[] = [
        {
            resourceType: 'Condition',
            id: 'condition-01',
            clinicalStatus: {coding: [{code: 'active'}]},
            verificationStatus: {coding: [{code: 'confirmed'}]},
            code: {text: 'Hypertension'},
            subject: {reference: 'Patient/test-patient-01'}
        },
        {
            resourceType: 'Condition',
            id: 'condition-02',
            clinicalStatus: {coding: [{code: 'active'}]},
            verificationStatus: {coding: [{code: 'confirmed'}]},
            code: {text: 'Type 2 Diabetes Mellitus'},
            subject: {reference: 'Patient/test-patient-01'},
            onsetDateTime: '2020-03-15'
        },
        {
            resourceType: 'Condition',
            id: 'condition-03',
            clinicalStatus: {coding: [{code: 'resolved'}]},
            verificationStatus: {coding: [{code: 'confirmed'}]},
            code: {text: 'Pneumonia'},
            subject: {reference: 'Patient/test-patient-01'},
            onsetDateTime: '2022-11-01',
            abatementDateTime: '2022-11-30'
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
            occurrenceDateTime: '2023-10-15',
            lotNumber: 'FLUVAX20231015'
        },
        {
            resourceType: 'Immunization',
            id: 'imm-03',
            status: 'completed',
            vaccineCode: {text: 'Tetanus Vaccine'},
            patient: {reference: 'Patient/test-patient-01'},
            primarySource: true,
            occurrenceDateTime: '2020-05-22',
            doseQuantity: {
                value: 0.5,
                unit: 'mL'
            }
        }
    ];
    const mockLaboratoryResults: TObservation[] = [
        {
            resourceType: 'Observation',
            id: 'lab-01',
            status: 'final',
            category: [{coding: [{code: 'laboratory'}]}],
            code: {text: 'Blood Glucose'},
            subject: {reference: 'Patient/test-patient-01'},
            effectiveDateTime: '2023-01-01',
            valueQuantity: {value: 100, unit: 'mg/dL'}
        },
        {
            resourceType: 'Observation',
            id: 'lab-02',
            status: 'final',
            category: [{coding: [{code: 'laboratory'}]}],
            code: {text: 'Hemoglobin A1c'},
            subject: {reference: 'Patient/test-patient-01'},
            effectiveDateTime: '2023-01-01',
            valueQuantity: {value: 6.5, unit: '%'},
            interpretation: [{
                coding: [{
                    system: 'http://terminology.hl7.org/CodeSystem/v3-ObservationInterpretation',
                    code: 'H',
                    display: 'High'
                }]
            }]
        },
        {
            resourceType: 'Observation',
            id: 'lab-03',
            status: 'final',
            category: [{coding: [{code: 'laboratory'}]}],
            code: {text: 'Cholesterol Panel'},
            subject: {reference: 'Patient/test-patient-01'},
            effectiveDateTime: '2023-01-01',
            hasMember: [
                {reference: 'Observation/ldl-01'},
                {reference: 'Observation/hdl-01'},
                {reference: 'Observation/triglycerides-01'}
            ]
        },
        {
            resourceType: 'Observation',
            id: 'lab-04',
            status: 'final',
            category: [{coding: [{code: 'laboratory'}]}],
            code: {text: 'CBC with Differential'},
            subject: {reference: 'Patient/test-patient-01'},
            effectiveDateTime: '2023-01-15',
            component: [
                {
                    code: {text: 'WBC'},
                    valueQuantity: {value: 7.5, unit: '10^9/L'}
                },
                {
                    code: {text: 'RBC'},
                    valueQuantity: {value: 4.9, unit: '10^12/L'}
                }
            ]
        }
    ];

    it('should generate narrative content for allergies using NarrativeGenerator', async () => {
        const result = NarrativeGenerator.generateNarrativeContent(IPSSections.ALLERGIES, mockAllergies, 'America/New_York');
        expect(result).toBeDefined();
        expect(result).toContain('Allergies and Intolerances');
        expect(result).toContain('Penicillin');
        expect(result).toContain('Peanuts');
        expect(result).toContain('Latex');
        expect(result).toContain('Anaphylaxis');
        console.info(result);
        // Read narrative from file
        const expectedDiv = readNarrativeFile(
            path.join(__dirname, 'fixtures'),
            IPS_SECTION_LOINC_CODES[IPSSections.ALLERGIES],
            IPS_SECTION_DISPLAY_NAMES[IPSSections.ALLERGIES]
        );
        await compareNarratives(
            result || '',
            expectedDiv || ''
        )
    });

    it('should generate narrative content for medications using NarrativeGenerator', () => {
        const result = NarrativeGenerator.generateNarrativeContent(IPSSections.MEDICATIONS, mockMedications, 'America/New_York');
        expect(result).toBeDefined();
        expect(result).toContain('Medication');
        expect(result).toContain('Aspirin');
        expect(result).toContain('Lisinopril');
        expect(result).toContain('10mg daily');
        expect(result).toContain('Amoxicillin');
        console.info(result);
    });

    it('should generate narrative content for problem list using NarrativeGenerator', () => {
        const result = NarrativeGenerator.generateNarrativeContent(IPSSections.PROBLEMS, mockConditions, 'America/New_York');
        expect(result).toBeDefined();
        expect(result).toContain('Problems');
        expect(result).toContain('Hypertension');
        expect(result).toContain('Type 2 Diabetes Mellitus');
        expect(result).toContain('Pneumonia');
        console.info(result);
    });

    it('should generate narrative content for immunizations using NarrativeGenerator', () => {
        const result = NarrativeGenerator.generateNarrativeContent(IPSSections.IMMUNIZATIONS, mockImmunizations, 'America/New_York');
        expect(result).toBeDefined();
        expect(result).toContain('Immunizations');
        expect(result).toContain('COVID-19 Vaccine');
        expect(result).toContain('Influenza Vaccine');
        expect(result).toContain('Tetanus Vaccine');
        console.info(result);
    });

    it('should generate narrative content for diagnostic results using NarrativeGenerator', () => {
        const result = NarrativeGenerator.generateNarrativeContent(IPSSections.LABORATORY_RESULTS, mockLaboratoryResults, 'America/New_York');
        expect(result).toBeDefined();
        expect(result).toContain('Diagnostic Results');
        expect(result).toContain('Blood Glucose');
        expect(result).toContain('Hemoglobin A1c');
        expect(result).toContain('Cholesterol Panel');
        expect(result).toContain('CBC with Differential');
        console.info(result);
    });
});
