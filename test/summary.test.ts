import {TPatient} from "../src/types/resources/Patient";
import {IPSResourceProfileRegistry} from "../src/profiles/ips_resource_profile_registry";
import {ComprehensiveIPSCompositionBuilder} from "../src/generators/fhir_summary_generator";
import {TAllergyIntolerance} from "../src/types/resources/AllergyIntolerance";
import {TMedicationRequest} from "../src/types/resources/MedicationRequest";
import {TCondition} from "../src/types/resources/Condition";
import {TImmunization} from "../src/types/resources/Immunization";
import {IPSSections} from "../src/structures/ips_sections";
import {IPS_SECTION_LOINC_CODES} from "../src/structures/ips_section_loinc_codes";
import {TDomainResource} from "../src/types/resources/DomainResource";
import {TComposition} from "../src/types/resources/Composition";

describe('ComprehensiveIPSCompositionBuilder', () => {
    // Mock patient resource
    const mockPatient: TPatient = {
        resourceType: 'Patient',
        id: 'example-patient',
        identifier: [{
            system: 'http://icanbwell.com',
            value: '12345'
        }],
        name: [{
            family: 'Doe',
            given: ['John']
        }],
        gender: 'male',
        birthDate: '1980-01-01'
    };

    // Mock resources for different sections
    const mockAllergies: TAllergyIntolerance[] = [{
        resourceType: 'AllergyIntolerance',
        id: 'allergy1',
        clinicalStatus: {coding: [{code: 'active'}]},
        code: {coding: [{code: 'nickel'}]},
        patient: {reference: `Patient/${mockPatient.id}`},
    }];

    const mockMedications: TMedicationRequest[] = [{
        resourceType: 'MedicationRequest',
        id: 'med1',
        status: 'active',
        medicationReference: {display: 'Test Medication'},
        subject: {reference: `Patient/${mockPatient.id}`},
        intent: 'order',
    }];

    const mockConditions: TCondition[] = [
        {
            resourceType: 'Condition',
            id: 'e6.ToRrlZE9pwFAPiLa6E2nRUitzucwMQODU8OsVpNGA3',
            clinicalStatus: {
                coding: [
                    {
                        system: 'http://terminology.hl7.org/CodeSystem/condition-clinical',
                        code: 'resolved',
                        display: 'Resolved'
                    }
                ],
                text: 'Resolved'
            },
            verificationStatus: {
                coding: [
                    {
                        system: 'http://terminology.hl7.org/CodeSystem/condition-ver-status',
                        code: 'confirmed',
                        display: 'Confirmed'
                    }
                ],
                text: 'Confirmed'
            },
            category: [
                {
                    coding: [
                        {
                            system: 'http://terminology.hl7.org/CodeSystem/condition-category',
                            code: 'problem-list-item',
                            display: 'Problem List Item'
                        }
                    ],
                    text: 'Problem List Item'
                }
            ],
            code: {
                coding: [
                    {
                        system: 'http://hl7.org/fhir/sid/icd-10-cm',
                        code: 'J18.9',
                        display: 'Pneumonia, unspecified organism'
                    }
                ],
                text: 'Pneumonia'
            },
            subject: {
                reference: 'Patient/example-patient',
                display: 'FHIR, Automation'
            },
            onsetDateTime: '2016-12-05',
            abatementDateTime: '2016-12-20',
            recordedDate: '2020-03-04'
        },
        {
            resourceType: 'Condition',
            id: 'eK.v1ndIFKTZm1ve0TRFa2byekZbTkS0xnsoQOqN-o5I3',
            clinicalStatus: {
                coding: [
                    {
                        system: 'http://terminology.hl7.org/CodeSystem/condition-clinical',
                        code: 'active',
                        display: 'Active'
                    }
                ],
                text: 'Active'
            },
            verificationStatus: {
                coding: [
                    {
                        system: 'http://terminology.hl7.org/CodeSystem/condition-ver-status',
                        code: 'confirmed',
                        display: 'Confirmed'
                    }
                ],
                text: 'Confirmed'
            },
            category: [
                {
                    coding: [
                        {
                            system: 'http://terminology.hl7.org/CodeSystem/condition-category',
                            code: 'problem-list-item',
                            display: 'Problem List Item'
                        }
                    ],
                    text: 'Problem List Item'
                }
            ],
            code: {
                coding: [
                    {
                        system: 'http://hl7.org/fhir/sid/icd-10-cm',
                        code: 'I10',
                        display: 'Essential (primary) hypertension'
                    }
                ],
                text: 'Essential hypertension'
            },
            subject: {
                reference: 'Patient/example-patient',
                display: 'FHIR, Automation'
            },
            onsetDateTime: '2020-03-04',
            recordedDate: '2020-03-04',
            severity: {
                text: 'Med'
            }
        }
    ];

    const mockImmunizations: TImmunization[] = [
        {
            resourceType: 'Immunization',
            id: 'emAKcOP2creGzeLlEt5R4MBF6oYm0wzxJ9aWwOTiOqHI3',
            identifier: [
                {
                    use: 'usual',
                    system: 'urn:oid:1.2.840.114350.1.13.1.1.7.2.768076',
                    value: '1000000246'
                }
            ],
            status: 'completed',
            vaccineCode: {
                coding: [
                    {
                        system: 'http://hl7.org/fhir/sid/cvx',
                        code: '03'
                    }
                ],
                text: 'MMR'
            },
            patient: {
                reference: 'Patient/example-patient',
                display: 'FHIR, Automation'
            },
            occurrenceDateTime: '2000-03-04',
            primarySource: false,
            reportOrigin: {
                coding: [
                    {
                        system: 'urn:oid:1.2.840.114350.1.13.1.1.7.10.768076.4082',
                        code: '1',
                        display: 'Patient reported'
                    }
                ],
                text: 'Patient reported'
            },
            location: {
                display: 'right arm'
            },
            performer: [
                {
                    function_: {
                        coding: [
                            {
                                system: 'http://terminology.hl7.org/CodeSystem/v2-0443',
                                code: 'AP',
                                display: 'Administering Provider'
                            }
                        ],
                        text: 'Administering Provider'
                    },
                    actor: {
                        reference: 'Practitioner/example-practitioner',
                        type: 'Practitioner',
                        display: 'Starter Provider'
                    }
                }
            ],
            note: [
                {
                    text: 'comment on MMR'
                }
            ]
        },
        {
            resourceType: 'Immunization',
            id: 'emAKcOP2creGzeLlEt5R4MFyM.TLHisGiY2OL7vh-KKI3',
            identifier: [
                {
                    use: 'usual',
                    system: 'urn:oid:1.2.840.114350.1.13.1.1.7.2.768076',
                    value: '1000000244'
                }
            ],
            status: 'completed',
            vaccineCode: {
                coding: [
                    {
                        system: 'http://hl7.org/fhir/sid/cvx',
                        code: '107'
                    }
                ],
                text: 'DTaP, Unspecified Formulation (IST) Imm-rx'
            },
            patient: {
                reference: 'Patient/example-patient',
                display: 'FHIR, Automation'
            },
            occurrenceDateTime: '2020-03-04T18:56:00Z',
            primarySource: true,
            location: {
                display: 'connectathon-testing for EpicConnect and Pulsar testing only'
            },
            manufacturer: {
                display: 'Merck, Sharp, Dohme'
            },
            lotNumber: '486745',
            expirationDate: '2030-03-04',
            site: {
                coding: [
                    {
                        system: 'urn:oid:1.2.840.114350.1.13.1.1.7.10.768076.4040',
                        code: '14',
                        display: 'Left arm'
                    }
                ],
                text: 'Left arm'
            },
            route: {
                coding: [
                    {
                        system: 'urn:oid:1.2.840.114350.1.13.1.1.7.10.768076.4030',
                        code: '2',
                        display: 'Intramuscular'
                    }
                ],
                text: 'Intramuscular'
            },
            doseQuantity: {
                value: 0.5,
                unit: 'mL',
                system: 'urn:oid:1.2.840.114350.1.13.1.1.7.10.768076.4019',
                code: '1'
            },
            performer: [
                {
                    function_: {
                        coding: [
                            {
                                system: 'http://terminology.hl7.org/CodeSystem/v2-0443',
                                code: 'AP',
                                display: 'Administering Provider'
                            }
                        ],
                        text: 'Administering Provider'
                    },
                    actor: {
                        reference: 'Practitioner/example-practitioner',
                        type: 'Practitioner',
                        display: 'Emily Williams, MD'
                    }
                }
            ],
            note: [
                {
                    text: 'comment on DTAP'
                }
            ]
        }
    ];

    // Mock validation method
    const mockValidateResource = jest.spyOn(IPSResourceProfileRegistry, 'validateResource');

    beforeEach(() => {
        mockValidateResource.mockClear();
        mockValidateResource.mockReturnValue(true);
    });

    describe('constructor', () => {
        it('should create an instance with a valid patient', () => {
            const builder = new ComprehensiveIPSCompositionBuilder(mockPatient);
            expect(builder).toBeTruthy();
        });

        it('should throw an error if patient resource is invalid', () => {
            mockValidateResource.mockReturnValueOnce(false);

            expect(() => {
                new ComprehensiveIPSCompositionBuilder(mockPatient);
            }).toThrow('Patient resource does not meet IPS requirements');
        });
    });

    describe('addSection', () => {
        it('should add a section with valid resources', () => {
            const builder = new ComprehensiveIPSCompositionBuilder(mockPatient);

            const result = builder.addSection(IPSSections.ALLERGIES, mockAllergies);

            expect(result).toBe(builder);
            expect(mockValidateResource).toHaveBeenCalledWith(mockAllergies[0], IPSSections.ALLERGIES);
        });

        it('should filter out invalid resources', () => {
            const builder = new ComprehensiveIPSCompositionBuilder(mockPatient);

            mockValidateResource.mockReturnValueOnce(false);

            expect(() => {
                const result = builder.addSection(IPSSections.ALLERGIES, mockAllergies);
                expect(result).toBe(builder);
            }).toThrow(/No valid resources for mandatory section: AllergyIntoleranceSection/);

            // Should throw error when trying to build with no valid sections
            expect(() => {
                builder.build();
            }).toThrow(/Missing mandatory IPS sections/);
        });

        it('should warn when no valid resources are found', () => {
            const builder = new ComprehensiveIPSCompositionBuilder(mockPatient);

            mockValidateResource.mockReturnValueOnce(false);

            expect(() => {
                builder.addSection(IPSSections.ALLERGIES, mockAllergies);

            }).toThrow(/No valid resources for mandatory section: AllergyIntoleranceSection/);
        });
    });

    describe('build', () => {
        it('should build a composition with all mandatory sections', () => {
            const builder = new ComprehensiveIPSCompositionBuilder(mockPatient);

            builder
                .addSection(IPSSections.ALLERGIES, mockAllergies)
                .addSection(IPSSections.MEDICATIONS, mockMedications)
                .addSection(IPSSections.PROBLEMS, mockConditions)
                .addSection(IPSSections.IMMUNIZATIONS, mockImmunizations)
            ;

            const sections = builder.build();

            for (const section of sections) {
                console.info(section.code?.coding?.[0]?.display);
            }

            expect(sections.length).toBe(5);
            expect(sections[0].code?.coding?.[0]?.code).toBe(IPS_SECTION_LOINC_CODES.Patient);
            expect(sections[1].code?.coding?.[0]?.code).toBe(IPS_SECTION_LOINC_CODES.AllergyIntoleranceSection);
            expect(sections[2].code?.coding?.[0]?.code).toBe(IPS_SECTION_LOINC_CODES.MedicationSection);
            expect(sections[3].code?.coding?.[0]?.code).toBe(IPS_SECTION_LOINC_CODES.ProblemSection);
            expect(sections[4].code?.coding?.[0]?.code).toBe(IPS_SECTION_LOINC_CODES.ImmunizationSection);
        });

        it('should throw an error if mandatory sections are missing', () => {
            const builder = new ComprehensiveIPSCompositionBuilder(mockPatient);

            // Not adding all mandatory sections
            builder.addSection(IPSSections.ALLERGIES, mockAllergies);

            expect(() => {
                builder.build();
            }).toThrow(/Missing mandatory IPS sections/);
        });
    });

    describe('integration', () => {
        it('should create a complete IPS composition', () => {
            const builder = new ComprehensiveIPSCompositionBuilder(mockPatient);

            builder
                .addSection(IPSSections.ALLERGIES, mockAllergies)
                .addSection(IPSSections.MEDICATIONS, mockMedications)
                .addSection(IPSSections.PROBLEMS, [{
                    resourceType: 'Condition',
                    id: 'condition1',
                    clinicalStatus: {coding: [{code: 'active'}]},
                    code: {coding: [{code: 'hypertension'}]}
                }])
                .addSection(IPSSections.IMMUNIZATIONS, [{
                    resourceType: 'Immunization',
                    id: 'immunization1',
                    status: 'completed',
                    vaccineCode: {coding: [{code: 'MMR'}]}
                }]);

            const sections = builder.build();

            expect(sections.length).toBe(5);
            sections.forEach(section => {
                expect(section.entry).toBeTruthy();
                expect(section.code?.coding?.[0]?.system).toBe('http://loinc.org');
            });

        });
    });
    describe('integration_bundle', () => {
        it('should create a complete IPS composition bundle', () => {
            const builder = new ComprehensiveIPSCompositionBuilder(mockPatient);

            builder
                .addSection(IPSSections.ALLERGIES, mockAllergies)
                .addSection(IPSSections.MEDICATIONS, mockMedications)
                .addSection(IPSSections.PROBLEMS, mockConditions)
                .addSection(IPSSections.IMMUNIZATIONS, mockImmunizations);

            const bundle = builder.build_bundle(
                'example-organization',
                'Example Organization',
                'https://fhir.icanbwell.com/4_0_0/'
            );
            console.info('---- Bundle ----');
            console.info(JSON.stringify(bundle));
            console.info('-----------------');

            expect(bundle.resourceType).toBe('Bundle');
            expect(bundle.type).toBe('document');
            expect(bundle.entry).toBeDefined();
            if (bundle.entry) {
                expect(bundle.entry.length).toBeGreaterThan(0);
                // first entry should be the Composition resource
                const composition: TComposition = bundle.entry[0].resource as TComposition;
                expect(composition.resourceType).toBe('Composition');
                expect(composition.type?.coding?.[0]?.system).toBe('http://loinc.org');
                expect(composition.type?.coding?.[0]?.code).toBe('60591-5'); // LOINC code for IPS
                expect(composition.subject?.reference).toBe(`Patient/${mockPatient.id}`);
                // check that the sections in the composition are present
                expect(composition.section).toBeDefined();
                console.assert(composition.section);
                if (composition.section) {
                    expect(composition.section.length).toBeGreaterThan(0);
                    // check that there is a patient section
                    const patientSection = composition.section.find(
                        section => section.code?.coding?.[0]?.code === IPS_SECTION_LOINC_CODES.Patient
                    );
                    expect(patientSection).toBeDefined();
                    const medicationSection = composition.section.find(
                        section => section.code?.coding?.[0]?.code === IPS_SECTION_LOINC_CODES.MedicationSection
                    );
                    expect(medicationSection).toBeDefined();

                    const conditionSection = composition.section.find(
                        section => section.code?.coding?.[0]?.code === IPS_SECTION_LOINC_CODES.ProblemSection
                    );
                    expect(conditionSection).toBeDefined();
                }

                // subsequent entries should be the sections
                expect(bundle.entry.length).toEqual(8);
                // check that each section has a valid LOINC code
                bundle.entry.slice(1).forEach((entry) => {
                    const section: TDomainResource = entry.resource as TDomainResource;
                    expect(section.resourceType).toBeDefined();
                });

            }
        });
    });
});