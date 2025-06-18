/* eslint-disable @typescript-eslint/no-unused-vars */
import * as path from 'path';
import {TPatient} from '../src/types/resources/Patient';
import {TAllergyIntolerance} from '../src/types/resources/AllergyIntolerance';
import {TMedicationStatement} from '../src/types/resources/MedicationStatement';
import {TCondition} from '../src/types/resources/Condition';
import {TImmunization} from '../src/types/resources/Immunization';
import {TObservation} from '../src/types/resources/Observation';
import { NarrativeGenerator } from '../src/generators/narrative_generator';
import { IPSSections } from '../src/structures/ips_sections';

describe('Narrative Generator Tests', () => {
    // Mock Resources for Testing
    const mockPatient: TPatient = {
        resourceType: 'Patient',
        id: 'test-patient-01',
        identifier: [{ system: 'https://example.org', value: '12345' }],
        name: [{ family: 'Doe', given: ['John'] }],
        gender: 'male',
        birthDate: '1980-01-01'
    };
    const mockAllergies: TAllergyIntolerance[] = [
        {
            resourceType: 'AllergyIntolerance',
            id: 'allergy-01',
            clinicalStatus: { coding: [{ code: 'active' }] },
            verificationStatus: { coding: [{ code: 'confirmed' }] },
            code: { text: 'Penicillin' },
            patient: { reference: 'Patient/test-patient-01' }
        }
    ];
    const mockMedications: TMedicationStatement[] = [
        {
            resourceType: 'MedicationStatement',
            id: 'med-01',
            status: 'active',
            medicationCodeableConcept: { text: 'Aspirin' },
            subject: { reference: 'Patient/test-patient-01' }
        }
    ];
    const mockConditions: TCondition[] = [
        {
            resourceType: 'Condition',
            id: 'condition-01',
            clinicalStatus: { coding: [{ code: 'active' }] },
            verificationStatus: { coding: [{ code: 'confirmed' }] },
            code: { text: 'Hypertension' },
            subject: { reference: 'Patient/test-patient-01' }
        }
    ];
    const mockImmunizations: TImmunization[] = [
        {
            resourceType: 'Immunization',
            id: 'imm-01',
            status: 'completed',
            vaccineCode: { text: 'COVID-19 Vaccine' },
            patient: { reference: 'Patient/test-patient-01' },
            primarySource: true,
            occurrenceDateTime: '2024-01-01'
        }
    ];
    const mockLaboratoryResults: TObservation[] = [
        {
            resourceType: 'Observation',
            id: 'lab-01',
            status: 'final',
            category: [{ coding: [{ code: 'laboratory' }] }],
            code: { text: 'Blood Glucose' },
            subject: { reference: 'Patient/test-patient-01' },
            effectiveDateTime: '2023-01-01',
            valueQuantity: { value: 100, unit: 'mg/dL' }
        }
    ];

    it('should generate narrative content for allergies using NarrativeGenerator', () => {
        const result = NarrativeGenerator.generateNarrativeContent(IPSSections.ALLERGIES, mockAllergies);
        expect(result).toBeDefined();
        expect(result).toContain('Allergies and Intolerances');
        expect(result).toContain('Penicillin');
    });

    it('should generate narrative content for medications using NarrativeGenerator', () => {
        const result = NarrativeGenerator.generateNarrativeContent(IPSSections.MEDICATIONS, mockMedications);
        expect(result).toBeDefined();
        expect(result).toContain('Medication');
        expect(result).toContain('Aspirin');
    });

    it('should generate narrative content for problem list using NarrativeGenerator', () => {
        const result = NarrativeGenerator.generateNarrativeContent(IPSSections.PROBLEMS, mockConditions);
        expect(result).toBeDefined();
        expect(result).toContain('Problems');
        expect(result).toContain('Hypertension');
    });

    it('should generate narrative content for immunizations using NarrativeGenerator', () => {
        const result = NarrativeGenerator.generateNarrativeContent(IPSSections.IMMUNIZATIONS, mockImmunizations);
        expect(result).toBeDefined();
        expect(result).toContain('Immunizations');
        expect(result).toContain('COVID-19 Vaccine');
    });

    it('should generate narrative content for diagnostic results using NarrativeGenerator', () => {
        const result = NarrativeGenerator.generateNarrativeContent(IPSSections.LABORATORY_RESULTS, mockLaboratoryResults);
        expect(result).toBeDefined();
        expect(result).toContain('Diagnostic Results');
        expect(result).toContain('Blood Glucose');
    });
});
