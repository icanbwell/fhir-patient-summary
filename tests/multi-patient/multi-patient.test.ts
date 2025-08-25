import {ComprehensiveIPSCompositionBuilder} from "../../src/generators/fhir_summary_generator";
import {NarrativeGenerator} from "../../src/generators/narrative_generator";
import {TPatient} from "../../src/types/resources/Patient";
import {TAllergyIntolerance} from "../../src/types/resources/AllergyIntolerance";
import {TMedicationStatement} from "../../src/types/resources/MedicationStatement";
import {IPSSections} from "../../src/structures/ips_sections";
import {TBundle} from "../../src/types/resources/Bundle";

describe('Multi-Patient Summary Generation', () => {
    // Create multiple patients with complementary data
    const patient1: TPatient = {
        resourceType: 'Patient',
        id: 'patient-01',
        identifier: [{
            system: 'https://hospital-a.org',
            value: 'PA-12345'
        }],
        name: [{
            family: 'Smith',
            given: ['John'],
            use: 'official'
        }],
        gender: 'male',
        birthDate: '1980-01-01',
        telecom: [{
            system: 'phone',
            value: '+1-555-123-4567',
            use: 'home'
        }, {
            system: 'email',
            value: 'john.smith@email.com',
            use: 'home'
        }],
        address: [{
            use: 'home',
            line: ['123 Main St'],
            city: 'Anytown',
            state: 'NY',
            postalCode: '12345',
            country: 'USA'
        }],
        maritalStatus: {
            text: 'Married'
        }
    };

    const patient2: TPatient = {
        resourceType: 'Patient',
        id: 'patient-02',
        identifier: [{
            system: 'https://hospital-b.org',
            value: 'PB-67890'
        }, {
            system: 'https://national-id.gov',
            value: 'SSN-123456789'
        }],
        name: [{
            family: 'Smith',
            given: ['John', 'Michael'],
            use: 'official'
        }, {
            family: 'Smith',
            given: ['Johnny'],
            use: 'nickname'
        }],
        telecom: [{
            system: 'phone',
            value: '15551234567', // Same phone without formatting
            use: 'mobile'
        }, {
            system: 'phone',
            value: '+1-555-987-6543',
            use: 'work'
        }],
        address: [{
            use: 'work',
            line: ['456 Business Ave'],
            city: 'Worktown',
            state: 'NY',
            postalCode: '54321',
            country: 'USA'
        }],
        communication: [{
            language: {
                coding: [{
                    system: 'urn:ietf:bcp:47',
                    code: 'en-US',
                    display: 'English (United States)'
                }],
                text: 'English'
            },
            preferred: true
        }, {
            language: {
                coding: [{
                    system: 'urn:ietf:bcp:47',
                    code: 'es-ES',
                    display: 'Spanish (Spain)'
                }],
                text: 'Spanish'
            },
            preferred: false
        }]
    };

    // Create complementary allergies
    const allergies1: TAllergyIntolerance[] = [
        {
            resourceType: 'AllergyIntolerance',
            id: 'allergy-01',
            clinicalStatus: {
                coding: [{code: 'active'}]
            },
            verificationStatus: {
                coding: [{code: 'confirmed'}]
            },
            code: {text: 'Penicillin'},
            patient: {reference: 'Patient/patient-01'}
        }
    ];

    const allergies2: TAllergyIntolerance[] = [
        {
            resourceType: 'AllergyIntolerance',
            id: 'allergy-02',
            clinicalStatus: {
                coding: [{code: 'active'}]
            },
            verificationStatus: {
                coding: [{code: 'confirmed'}]
            },
            code: {text: 'Shellfish'},
            patient: {reference: 'Patient/patient-02'}
        },
        {
            resourceType: 'AllergyIntolerance',
            id: 'allergy-03',
            clinicalStatus: {
                coding: [{code: 'inactive'}]
            },
            verificationStatus: {
                coding: [{code: 'confirmed'}]
            },
            code: {text: 'Latex'},
            patient: {reference: 'Patient/patient-02'}
        }
    ];

    // Create complementary medications
    const medications1: TMedicationStatement[] = [
        {
            resourceType: 'MedicationStatement',
            id: 'med-01',
            status: 'active',
            medicationCodeableConcept: {text: 'Aspirin 81mg'},
            subject: {reference: 'Patient/patient-01'}
        }
    ];

    const medications2: TMedicationStatement[] = [
        {
            resourceType: 'MedicationStatement',
            id: 'med-02',
            status: 'active',
            medicationCodeableConcept: {text: 'Lisinopril 10mg'},
            subject: {reference: 'Patient/patient-02'}
        },
        {
            resourceType: 'MedicationStatement',
            id: 'med-03',
            status: 'completed',
            medicationCodeableConcept: {text: 'Amoxicillin 500mg'},
            subject: {reference: 'Patient/patient-02'}
        }
    ];

    describe('Patient Data Merging', () => {
        test('Should merge multiple patients into combined summary', async () => {
            const narrative = await NarrativeGenerator.generateNarrativeAsync(
                IPSSections.PATIENT, 
                [patient1, patient2], 
                'America/New_York'
            );

            expect(narrative).toBeDefined();
            expect(narrative?.status).toBe('generated');
            
            // Should contain information from both patients
            expect(narrative?.div).toContain('John');
            expect(narrative?.div).toContain('Smith');
            expect(narrative?.div).toContain('Male');
            expect(narrative?.div).toContain('1980-01-01');
            
            // Should contain identifiers from both sources
            expect(narrative?.div).toContain('hospital-a.org');
            expect(narrative?.div).toContain('hospital-b.org');
            expect(narrative?.div).toContain('national-id.gov');
            
            // Should contain addresses from both patients
            expect(narrative?.div).toContain('Main St');
            expect(narrative?.div).toContain('Business Ave');
            
            // Should contain communication info
            expect(narrative?.div).toContain('English');
            
            console.log('Combined Patient Narrative:', narrative?.div);
        });

        test('Should deduplicate similar phone numbers', async () => {
            const narrative = await NarrativeGenerator.generateNarrativeAsync(
                IPSSections.PATIENT, 
                [patient1, patient2], 
                'America/New_York'
            );

            // Should contain both unique numbers but deduplicate the same number in different formats
            const htmlContent = narrative?.div || '';
            
            // Count occurrences of the phone number (should appear only once despite different formatting)
            const phoneMatches = htmlContent.match(/555.*123.*4567/g);
            expect(phoneMatches?.length).toBeLessThanOrEqual(1); // Should be deduplicated
            
            // Should still contain the work phone
            expect(htmlContent).toContain('555-987-6543');
        });

        test('Should prefer non-empty fields when merging', async () => {
            // Create patient with minimal data
            const minimalPatient: TPatient = {
                resourceType: 'Patient',
                id: 'patient-minimal',
                name: [{
                    family: 'Doe',
                    given: ['Jane']
                }]
                // Missing gender, birthDate, etc.
            };

            const narrative = await NarrativeGenerator.generateNarrativeAsync(
                IPSSections.PATIENT, 
                [minimalPatient, patient1], 
                'America/New_York'
            );

            // Should use gender and birthDate from patient1 since minimal patient lacks them
            expect(narrative?.div).toContain('Male'); // From patient1
            expect(narrative?.div).toContain('1980-01-01'); // From patient1
            expect(narrative?.div).toContain('Jane Doe'); // From minimal patient
            expect(narrative?.div).toContain('John Smith'); // From patient1
        });
    });

    describe('Multi-Patient Bundle Processing', () => {
        test('Should process bundle with multiple patients and combine resources', async () => {
            // Create a bundle with multiple patients and their resources
            const bundle: TBundle = {
                resourceType: 'Bundle',
                type: 'collection',
                entry: [
                    {
                        resource: patient1
                    },
                    {
                        resource: patient2
                    },
                    ...allergies1.map(allergy => ({ resource: allergy })),
                    ...allergies2.map(allergy => ({ resource: allergy })),
                    ...medications1.map(med => ({ resource: med })),
                    ...medications2.map(med => ({ resource: med }))
                ]
            };

            const builder = new ComprehensiveIPSCompositionBuilder();
            await builder.readBundleAsync(bundle, 'America/New_York');

            const sections = builder.getSections();
            
            // Should have sections for allergies and medications
            const allergySection = sections.find(s => s.title?.includes('Allergies'));
            const medicationSection = sections.find(s => s.title?.includes('Medication'));
            
            expect(allergySection).toBeDefined();
            expect(medicationSection).toBeDefined();
            
            // Should contain all allergies from both patients
            expect(allergySection?.entry?.length).toBe(3); // 1 from patient1, 2 from patient2
            
            // Should contain all medications from both patients
            expect(medicationSection?.entry?.length).toBe(3); // 1 from patient1, 2 from patient2
            
            // Should have patient narrative combining both patients
            const finalBundle = await builder.buildBundleAsync(
                'test-org',
                'Test Organization',
                'https://example.com/fhir',
                'America/New_York'
            );
            
            expect(finalBundle.entry?.length).toBeGreaterThan(0);
            
            // Should include both patients in the bundle
            const patientEntries = finalBundle.entry?.filter(e => e.resource?.resourceType === 'Patient');
            expect(patientEntries?.length).toBe(2);
            
            // Composition should reference combined data
            const composition = finalBundle.entry?.find(e => e.resource?.resourceType === 'Composition')?.resource;
            expect(composition).toBeDefined();
            
            console.log('Multi-patient bundle created with', finalBundle.entry?.length, 'entries');
        });

        test('Should handle empty sections gracefully for multi-patient scenario', async () => {
            // Create bundle with patients but no other resources
            const bundle: TBundle = {
                resourceType: 'Bundle',
                type: 'collection',
                entry: [
                    { resource: patient1 },
                    { resource: patient2 }
                ]
            };

            const builder = new ComprehensiveIPSCompositionBuilder();
            await builder.readBundleAsync(bundle, 'America/New_York');
            
            const finalBundle = await builder.buildBundleAsync(
                'test-org',
                'Test Organization',
                'https://example.com/fhir',
                'America/New_York'
            );

            expect(finalBundle).toBeDefined();
            expect(finalBundle.entry?.length).toBeGreaterThan(2); // At least composition + 2 patients + organization
        });
    });

    describe('Deduplication Across Multiple Patients', () => {
        test('Should deduplicate names across patients', async () => {
            // Create patients with overlapping names
            const patient3: TPatient = {
                resourceType: 'Patient',
                id: 'patient-03',
                name: [{
                    family: 'Smith',
                    given: ['John'],
                    use: 'official'
                }, {
                    family: 'Smith',
                    given: ['John'],
                    use: 'usual' // Duplicate name with different use
                }]
            };

            const patient4: TPatient = {
                resourceType: 'Patient',
                id: 'patient-04',
                name: [{
                    family: 'Smith',
                    given: ['John'], // Same as patient3
                    use: 'official'
                }]
            };

            const narrative = await NarrativeGenerator.generateNarrativeAsync(
                IPSSections.PATIENT, 
                [patient3, patient4], 
                'America/New_York'
            );

            const htmlContent = narrative?.div || '';
            
            // Count how many times "John Smith" appears
            const nameMatches = htmlContent.match(/John Smith/g);
            // Should appear only once despite being in multiple patients and uses
            expect(nameMatches?.length).toBe(1);
        });

        test('Should deduplicate addresses across patients', async () => {
            const patient5: TPatient = {
                resourceType: 'Patient',
                id: 'patient-05',
                address: [{
                    text: '123 Main Street, Anytown, USA'
                }]
            };

            const patient6: TPatient = {
                resourceType: 'Patient',
                id: 'patient-06',
                address: [{
                    text: '123 Main Street, Anytown, USA' // Exact duplicate
                }, {
                    line: ['456 Oak Ave'],
                    city: 'Different City'
                }]
            };

            const narrative = await NarrativeGenerator.generateNarrativeAsync(
                IPSSections.PATIENT, 
                [patient5, patient6], 
                'America/New_York'
            );

            const htmlContent = narrative?.div || '';
            
            // Should contain unique addresses only
            expect(htmlContent).toContain('123 Main Street');
            expect(htmlContent).toContain('456 Oak Ave');
            
            // Count occurrences of the duplicate address
            const addressMatches = htmlContent.match(/123 Main Street, Anytown, USA/g);
            expect(addressMatches?.length).toBe(1);
        });
    });
});
