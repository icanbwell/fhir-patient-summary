/* eslint-disable @typescript-eslint/no-unused-vars */
import * as path from 'path';
import nunjucks from 'nunjucks';
import {TPatient} from '../src/types/resources/Patient';
import {TAllergyIntolerance} from '../src/types/resources/AllergyIntolerance';
import {TMedicationStatement} from '../src/types/resources/MedicationStatement';
import {TCondition} from '../src/types/resources/Condition';
import {TImmunization} from '../src/types/resources/Immunization';
import {TObservation} from '../src/types/resources/Observation';
import {TBundle} from '../src/types/resources/Bundle';

describe('Jinja2 Narrative Templates', () => {
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

    const env = nunjucks.configure(path.join(__dirname, '../src/narratives/templates/jinja2'), {
        autoescape: false,
        noCache: true
    });

    it('should render allergyintolerance.j2 with mock bundle', () => {
        const templateName = 'allergyintolerance.j2';
        const bundle: TBundle = {
            resourceType: 'Bundle',
            type: 'document',
            entry: mockAllergies.map(allergy => ({ resource: allergy }))
        };
        const result = env.render(templateName, { resource: bundle });
        expect(result).toContain('Allergies And Intolerances');
        expect(result).toContain('Penicillin');
    });

    it('should render medicationsummary.j2 with mock bundle', () => {
        const templateName = 'medicationsummary.j2';
        const bundle: TBundle = {
            resourceType: 'Bundle',
            type: 'document',
            entry: mockMedications.map(med => ({ resource: med }))
        };
        const result = env.render(templateName, { resource: bundle });
        expect(result).toContain('Medication Summary');
        expect(result).toContain('Aspirin');
    });

    it('should render problemlist.j2 with mock bundle', () => {
        const templateName = 'problemlist.j2';
        const bundle: TBundle = {
            resourceType: 'Bundle',
            type: 'document',
            entry: mockConditions.map(cond => ({ resource: cond }))
        };
        const result = env.render(templateName, { resource: bundle });
        expect(result).toContain('Problem List');
        expect(result).toContain('Hypertension');
    });

    it('should render immunizations.j2 with mock bundle', () => {
        const templateName = 'immunizations.j2';
        const bundle: TBundle = {
            resourceType: 'Bundle',
            type: 'document',
            entry: mockImmunizations.map(imm => ({ resource: imm }))
        };
        const result = env.render(templateName, { resource: bundle });
        expect(result).toContain('Immunizations');
        expect(result).toContain('COVID-19 Vaccine');
    });

    it('should render diagnosticresults.j2 with mock bundle', () => {
        const templateName = 'diagnosticresults.j2';
        const bundle: TBundle = {
            resourceType: 'Bundle',
            type: 'document',
            entry: mockLaboratoryResults.map(obs => ({ resource: obs }))
        };
        const result = env.render(templateName, { resource: bundle });
        expect(result).toContain('Diagnostic Results');
        expect(result).toContain('Blood Glucose');
    });
});
