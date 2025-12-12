import * as path from 'path';
import {TPatient} from '../../src/types/resources/Patient';
import {TAllergyIntolerance} from '../../src/types/resources/AllergyIntolerance';
import {TMedicationStatement} from '../../src/types/resources/MedicationStatement';
import {TCondition} from '../../src/types/resources/Condition';
import {TImmunization} from '../../src/types/resources/Immunization';
import {TObservation} from '../../src/types/resources/Observation';
import {IPSSections} from '../../src/structures/ips_sections';
import {IPS_SECTION_DISPLAY_NAMES, IPS_SECTION_LOINC_CODES} from "../../src/structures/ips_section_loinc_codes";
import {compareNarratives, readNarrativeFile} from "../utilities/testHelpers";
import {TDevice} from '../../src/types/resources/Device';
import {TDiagnosticReport} from '../../src/types/resources/DiagnosticReport';
import {TProcedure} from '../../src/types/resources/Procedure';
import {TCarePlan} from '../../src/types/resources/CarePlan';
import {TConsent} from '../../src/types/resources/Consent';
import {NarrativeGenerator} from "../../src";

describe('Narrative Generator Tests', () => {
    // Generate dynamic dates relative to current date
    const now = new Date();
    const currentYear = now.getFullYear();

    const formatDate = (date: Date): string => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

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
            subject: {reference: 'Patient/test-patient-01'},
            effectivePeriod: {
                start: '2023-12-01',
                end: '2023-12-10'
            }
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
            ],
            effectivePeriod: {
                start: '2023-12-01',
                end: '2023-12-10'
            }
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
            onsetDateTime: '2025-03-15'
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
            effectiveDateTime: formatDate(new Date(currentYear, 0, 1)),
            valueQuantity: {value: 100, unit: 'mg/dL'}
        },
        {
            resourceType: 'Observation',
            id: 'lab-02',
            status: 'final',
            category: [{coding: [{code: 'laboratory'}]}],
            code: {
                coding: [
                    {
                        system: "http://loinc.org",
                        code: "718-7",
                    }
                ],
                text: 'Hemoglobin A1c'
            },
            subject: {reference: 'Patient/test-patient-01'},
            effectiveDateTime: formatDate(new Date(currentYear, 0, 1)),
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
            effectiveDateTime: formatDate(new Date(currentYear, 0, 1)),
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
            effectiveDateTime: formatDate(new Date(currentYear, 0, 15)),
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

    // Additional mock resources for other sections
    const mockVitalSigns: TObservation[] = [
        {
            resourceType: 'Observation',
            id: 'vital-01',
            status: 'final',
            category: [{coding: [{code: 'vital-signs'}]}],
            code: {text: 'Blood Pressure'},
            subject: {reference: 'Patient/test-patient-01'},
            effectiveDateTime: '2023-01-01',
            component: [
                {
                    code: {text: 'Systolic'},
                    valueQuantity: {value: 120, unit: 'mmHg'}
                },
                {
                    code: {text: 'Diastolic'},
                    valueQuantity: {value: 80, unit: 'mmHg'}
                }
            ]
        },
        {
            resourceType: 'Observation',
            id: 'vital-02',
            status: 'final',
            category: [{coding: [{code: 'vital-signs'}]}],
            code: {text: 'Heart Rate'},
            subject: {reference: 'Patient/test-patient-01'},
            effectiveDateTime: '2023-01-01',
            valueQuantity: {value: 72, unit: 'bpm'}
        },
        {
            resourceType: 'Observation',
            id: 'vital-03',
            status: 'final',
            category: [{coding: [{code: 'vital-signs'}]}],
            code: {text: 'Body Temperature'},
            subject: {reference: 'Patient/test-patient-01'},
            effectiveDateTime: '2023-01-01',
            valueQuantity: {value: 37.0, unit: '°C'}
        }
    ];

    const mockMedicalDevices: TDevice[] = [
        {
            resourceType: 'Device',
            id: 'device-01',
            status: 'active',
            deviceName: [{name: 'Pacemaker', type: 'user-friendly-name'}],
            patient: {reference: 'Patient/test-patient-01'}
        },
        {
            resourceType: 'Device',
            id: 'device-02',
            status: 'active',
            deviceName: [{name: 'Insulin Pump', type: 'user-friendly-name'}],
            patient: {reference: 'Patient/test-patient-01'},
            manufacturer: 'MedTech Inc.',
            modelNumber: 'IP-2023',
            manufactureDate: '2023-01-01'
        },
        {
            resourceType: 'Device',
            id: 'device-03',
            status: 'inactive',
            deviceName: [{name: 'Stent', type: 'user-friendly-name'}],
            patient: {reference: 'Patient/test-patient-01'},
            note: [{text: 'Removed due to infection'}]
        }
    ];

    const mockDiagnosticReports: TDiagnosticReport[] = [
        {
            resourceType: 'DiagnosticReport',
            id: 'report-01',
            status: 'final',
            code: {text: 'Chest X-Ray'},
            subject: {reference: 'Patient/test-patient-01'},
            effectiveDateTime: '2023-01-15',
            conclusion: 'No acute cardiopulmonary process'
        },
        {
            resourceType: 'DiagnosticReport',
            id: 'report-02',
            status: 'final',
            code: {text: 'MRI Brain'},
            subject: {reference: 'Patient/test-patient-01'},
            effectiveDateTime: '2023-02-01',
            conclusion: 'Normal brain MRI',
            presentedForm: [
                {
                    contentType: 'application/pdf',
                    title: 'Brain MRI Report'
                }
            ]
        }
    ];

    const mockProcedures: TProcedure[] = [
        {
            resourceType: 'Procedure',
            id: 'proc-01',
            status: 'completed',
            code: {text: 'Appendectomy'},
            subject: {reference: 'Patient/test-patient-01'},
            performedDateTime: '2022-05-10'
        },
        {
            resourceType: 'Procedure',
            id: 'proc-02',
            status: 'completed',
            code: {text: 'Colonoscopy'},
            subject: {reference: 'Patient/test-patient-01'},
            performedDateTime: '2023-03-15',
            note: [{text: 'No polyps found'}]
        }
    ];

    const mockSocialHistory: TObservation[] = [
        {
            resourceType: 'Observation',
            id: 'social-01',
            status: 'final',
            category: [{coding: [{code: 'social-history'}]}],
            code: {text: 'Tobacco Use'},
            subject: {reference: 'Patient/test-patient-01'},
            effectiveDateTime: '2023-01-01',
            valueCodeableConcept: {text: 'Former smoker'}
        },
        {
            resourceType: 'Observation',
            id: 'social-02',
            status: 'final',
            category: [{coding: [{code: 'social-history'}]}],
            code: {text: 'Alcohol Use'},
            subject: {reference: 'Patient/test-patient-01'},
            effectiveDateTime: '2023-01-01',
            valueCodeableConcept: {text: 'Social drinker'}
        }
    ];

    const mockAdvanceDirectives: TConsent[] = [
        {
            resourceType: 'Consent',
            id: 'adv-01',
            status: 'active',
            category: [{text: 'Advance Directive'}],
            patient: {reference: 'Patient/test-patient-01'},
            dateTime: '2023-01-01',
            provision: {
                type: 'permit',
                period: {
                    start: '2023-01-01'
                }
            },
            scope: {
                coding: [{
                    system: 'http://terminology.hl7.org/CodeSystem/consentscope',
                    code: 'advance-directive',
                    display: 'Advance Directive'
                }]
            }
        }
    ];

    const mockCarePlans: TCarePlan[] = [
        {
            resourceType: 'CarePlan',
            id: 'care-01',
            status: 'active',
            intent: 'plan',
            title: 'Diabetes Management Plan',
            subject: {reference: 'Patient/test-patient-01'},
            period: {
                start: '2023-01-01'
            },
            activity: [
                {
                    detail: {
                        status: 'in-progress',
                        description: 'Monitor blood glucose daily'
                    }
                },
                {
                    detail: {
                        status: 'in-progress',
                        description: 'Low-carbohydrate diet'
                    }
                }
            ]
        }
    ];

    it('should generate narrative content for patient using NarrativeGenerator', async () => {
        const section = IPSSections.PATIENT;
        const result: string | undefined = await NarrativeGenerator.generateNarrativeContentAsync(section, [mockPatient], 'America/New_York');
        expect(result).toBeDefined();
        console.info(result);
        // Read narrative from file
        const expectedDiv = readNarrativeFile(
            path.join(__dirname, 'fixtures'),
            IPS_SECTION_LOINC_CODES[section],
            IPS_SECTION_DISPLAY_NAMES[section]
        );
        await compareNarratives(
            result,
            expectedDiv
        );
    });

    it('should generate narrative content for allergies using NarrativeGenerator', async () => {
        const section = IPSSections.ALLERGIES;
        const result: string | undefined = await NarrativeGenerator.generateNarrativeContentAsync(section, mockAllergies, 'America/New_York');
        expect(result).toBeDefined();
        expect(result).toContain('Penicillin');
        expect(result).toContain('Peanuts');
        expect(result).toContain('Latex');
        expect(result).toContain('Anaphylaxis');
        console.info(result);
        // Read narrative from file
        const expectedDiv = readNarrativeFile(
            path.join(__dirname, 'fixtures'),
            IPS_SECTION_LOINC_CODES[section],
            IPS_SECTION_DISPLAY_NAMES[section]
        );
        await compareNarratives(
            result,
            expectedDiv
        );
    });

    it('should generate narrative content for medications using NarrativeGenerator', async () => {
        const section = IPSSections.MEDICATIONS;
        const result = await NarrativeGenerator.generateNarrativeContentAsync(
            section, mockMedications, 'America/New_York',
            false,
            new Date('2023-12-15')
        );
        expect(result).toBeDefined();
        expect(result).toContain('Medication');
        expect(result).toContain('Aspirin');
        expect(result).toContain('Lisinopril');
        expect(result).toContain('10mg daily');
        expect(result).toContain('Amoxicillin');
        console.info(result);
        // Read narrative from file
        const expectedDiv = readNarrativeFile(
            path.join(__dirname, 'fixtures'),
            IPS_SECTION_LOINC_CODES[section],
            IPS_SECTION_DISPLAY_NAMES[section]
        );
        await compareNarratives(
            result,
            expectedDiv
        );
    });

    it('should generate narrative content for problem list using NarrativeGenerator', async () => {
        const section = IPSSections.PROBLEMS;
        const result = await NarrativeGenerator.generateNarrativeContentAsync(
            section, mockConditions, 'America/New_York',
            false,
            new Date('2023-12-15')
        );
        expect(result).toBeDefined();
        expect(result).toContain('Hypertension');
        expect(result).toContain('Type 2 Diabetes Mellitus');
        expect(result).toContain('Pneumonia');
        console.info(result);
        // Read narrative from file
        const expectedDiv = readNarrativeFile(
            path.join(__dirname, 'fixtures'),
            IPS_SECTION_LOINC_CODES[section],
            IPS_SECTION_DISPLAY_NAMES[section]
        );
        await compareNarratives(
            result,
            expectedDiv
        );
    });

    it('should generate narrative content for immunizations using NarrativeGenerator', async () => {
        const section = IPSSections.IMMUNIZATIONS;
        const result = await NarrativeGenerator.generateNarrativeContentAsync(section, mockImmunizations, 'America/New_York');
        expect(result).toBeDefined();
        expect(result).toContain('COVID-19 Vaccine');
        expect(result).toContain('Influenza Vaccine');
        expect(result).toContain('Tetanus Vaccine');
        console.info(result);
        // Read narrative from file
        const expectedDiv = readNarrativeFile(
            path.join(__dirname, 'fixtures'),
            IPS_SECTION_LOINC_CODES[section],
            IPS_SECTION_DISPLAY_NAMES[section]
        );
        await compareNarratives(
            result,
            expectedDiv
        );
    });

    it('should generate narrative content for vital signs using NarrativeGenerator', async () => {
        const section = IPSSections.VITAL_SIGNS;
        const result = await NarrativeGenerator.generateNarrativeContentAsync(section, mockVitalSigns, 'America/New_York');
        expect(result).toBeDefined();
        expect(result).toContain('Blood Pressure');
        expect(result).toContain('Heart Rate');
        expect(result).toContain('Body Temperature');
        console.info(result);
        // Read narrative from file
        const expectedDiv = readNarrativeFile(
            path.join(__dirname, 'fixtures'),
            IPS_SECTION_LOINC_CODES[section],
            IPS_SECTION_DISPLAY_NAMES[section]
        );
        await compareNarratives(
            result,
            expectedDiv
        );
    });

    it('should generate narrative content for medical devices using NarrativeGenerator', async () => {
        const section = IPSSections.MEDICAL_DEVICES;
        const result = await NarrativeGenerator.generateNarrativeContentAsync(section, mockMedicalDevices, 'America/New_York');
        expect(result).toBeDefined();
        console.info(result);
        // Read narrative from file
        const expectedDiv = readNarrativeFile(
            path.join(__dirname, 'fixtures'),
            IPS_SECTION_LOINC_CODES[section],
            IPS_SECTION_DISPLAY_NAMES[section]
        );
        await compareNarratives(
            result,
            expectedDiv
        );
    });

    it('should generate narrative content for diagnostic reports using NarrativeGenerator', async () => {
        const section = IPSSections.DIAGNOSTIC_REPORTS;
        const mockDiagnosticReportsAndLaboratoryResults = [...mockDiagnosticReports, ...mockLaboratoryResults];
        const result = await NarrativeGenerator.generateNarrativeContentAsync(section, mockDiagnosticReportsAndLaboratoryResults, 'America/New_York');
        expect(result).toBeDefined();
        // Only observations with LOINC codes in LAB_LOINC_MAP are included
        expect(result).toContain('Hemoglobin A1c');
        expect(result).toContain('6.5 %');
        expect(result).toContain(new Date(currentYear, 0, 1).toLocaleDateString('en-US', {
            month: '2-digit',
            day: '2-digit',
            year: 'numeric'
        }));
        console.info(result);
    });

    it('should generate narrative content for procedures using NarrativeGenerator', async () => {
        const section = IPSSections.PROCEDURES;
        const result = await NarrativeGenerator.generateNarrativeContentAsync(section, mockProcedures, 'America/New_York');
        expect(result).toBeDefined();
        expect(result).toContain('Appendectomy');
        expect(result).toContain('Colonoscopy');
        console.info(result);
        // Read narrative from file
        const expectedDiv = readNarrativeFile(
            path.join(__dirname, 'fixtures'),
            IPS_SECTION_LOINC_CODES[section],
            IPS_SECTION_DISPLAY_NAMES[section]
        );
        await compareNarratives(
            result,
            expectedDiv
        );
    });

    it('should generate narrative content for social history using NarrativeGenerator', async () => {
        const section = IPSSections.SOCIAL_HISTORY;
        const result = await NarrativeGenerator.generateNarrativeContentAsync(section, mockSocialHistory, 'America/New_York');
        expect(result).toBeDefined();
        expect(result).toContain('Tobacco Use');
        expect(result).toContain('Alcohol Use');
        console.info(result);
        // Read narrative from file
        const expectedDiv = readNarrativeFile(
            path.join(__dirname, 'fixtures'),
            IPS_SECTION_LOINC_CODES[section],
            IPS_SECTION_DISPLAY_NAMES[section]
        );
        await compareNarratives(
            result,
            expectedDiv
        );
    });

    it('should generate narrative content for advance directives using NarrativeGenerator', async () => {
        const section = IPSSections.ADVANCE_DIRECTIVES;
        const result = await NarrativeGenerator.generateNarrativeContentAsync(section, mockAdvanceDirectives, 'America/New_York');
        expect(result).toBeDefined();
        console.info(result);
        // Read narrative from file
        const expectedDiv = readNarrativeFile(
            path.join(__dirname, 'fixtures'),
            IPS_SECTION_LOINC_CODES[section],
            IPS_SECTION_DISPLAY_NAMES[section]
        );
        await compareNarratives(
            result,
            expectedDiv
        );
    });

    it('should generate narrative content for care plans using NarrativeGenerator', async () => {
        const section = IPSSections.CARE_PLAN;
        const result = await NarrativeGenerator.generateNarrativeContentAsync(section, mockCarePlans, 'America/New_York');
        expect(result).toBeDefined();
        // expect(result).toContain('Diabetes Management Plan');
        console.info(result);
        // Read narrative from file
        const expectedDiv = readNarrativeFile(
            path.join(__dirname, 'fixtures'),
            IPS_SECTION_LOINC_CODES[section],
            IPS_SECTION_DISPLAY_NAMES[section]
        );
        await compareNarratives(
            result,
            expectedDiv
        );
    });
});
