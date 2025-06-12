/* eslint-disable @typescript-eslint/no-unused-vars */
import {STANDARD_CONFIGURATION, TemplateEngine} from 'thymeleaf';
import * as fs from 'fs';
import * as path from 'path';
import {TPatient} from "../src/types/resources/Patient";
import {TAllergyIntolerance} from "../src/types/resources/AllergyIntolerance";
import {TMedicationStatement} from "../src/types/resources/MedicationStatement";
import {TCondition} from "../src/types/resources/Condition";
import {TImmunization} from "../src/types/resources/Immunization";
import {TObservation} from "../src/types/resources/Observation";
import {TBundle} from "../src/types/resources/Bundle";


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
        }
    ];

    const mockMedications: TMedicationStatement[] = [
        {
            resourceType: 'MedicationStatement',
            id: 'med-01',
            status: 'active',
            medicationCodeableConcept: {text: 'Aspirin'},
            subject: {reference: 'Patient/test-patient-01'},
            // taken: 'y'
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
        }
    ];

    it('should create result from inline template', () => {
        const templateEngine = new TemplateEngine();

        // Render template from string
        templateEngine.process('<div thjs:text="${greeting}">(greeting)</div>', {greeting: 'Hello!'})
            .then(result => {
                // Do something with the result...
                console.info(result);
            });
    });
    it('should create result from file template', async () => {
        // const templateEngine = new TemplateEngine(
        //     {
        //         dialects: [new StandardDialect('th', { // Enable isomorphic mode with this config object
        //             prefix: 'thjs'
        //         })],
        //         templateResolver: {
        //             resolveTemplate: (key: string, parameters: any) => {
        //                 return path.join(__dirname, '../src/narratives/templates/', key);
        //             }
        //         },
        //         messageResolver: {
        //             resolveMessage: (key: string, parameters: any) => {
        //                 return path.join(__dirname, '../src/narratives/messages/', key);
        //             }
        //         }
        //     }
        // );
        const templateEngine = new TemplateEngine(STANDARD_CONFIGURATION);


        const filePath = path.join(__dirname, '../src/narratives/templates/allergyintolerance.html');
        if (fs.existsSync(filePath)) {
            const bundle: TBundle = {
                resourceType: 'Bundle',
                type: 'document',
                entry: [
                    ...mockAllergies.map(allergy => ({resource: allergy})),
                ]
            }
            // Render template from file
            const result = await templateEngine.processFile(filePath, bundle);
            console.info(result);
        } else {
            console.error('Template file does not exist:', filePath);
        }
    });
});