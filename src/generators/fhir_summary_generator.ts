// Comprehensive IPS Resource Mapping
import {IPSMandatorySections} from "../structures/ips_mandatory_sections";
import {IPSResourceProfileRegistry} from "../profiles/ips_resource_profile_registry";
import {TPatient} from "../types/resources/Patient";
import {TCompositionSection} from "../types/partials/CompositionSection";
import {TDomainResource} from "../types/resources/DomainResource";

export class ComprehensiveIPSCompositionBuilder {
    private patient: TPatient;
    private sections: TCompositionSection[] = [];

    constructor(patient: TPatient) {
        // Validate patient resource
        if (!IPSResourceProfileRegistry.validateResource(
            patient,
            IPSMandatorySections.PATIENT
        )) {
            throw new Error('Patient resource does not meet IPS requirements');
        }
        this.patient = patient;
    }

    // Methods to add sections with validation
    addSection<T extends TDomainResource>(
        resourceType: string,
        resources: T[]
    ): this {
        // Validate each resource
        const validResources = resources.filter(resource =>
            IPSResourceProfileRegistry.validateResource(resource, resourceType)
        );

        if (validResources.length === 0) {
            console.warn(`No valid resources for ${resourceType}`);
            return this;
        }

        // Existing section generation logic
        this.sections.push({
            code: {
                coding: [
                    {
                        system: 'http://loinc.org',
                        code: resourceType,
                        display: `Section for ${resourceType}`
                    }
                ]
            },
            entry: validResources.map(resource => ({
                reference: `Resource/${resource.id}`,
                display: resource.resourceType
            }))
        });

        return this;
    }

    // Comprehensive build method
    build(): TCompositionSection[] {
        // Ensure all mandatory sections are present
        const mandatorySections = Object.values(IPSMandatorySections);
        const presentSectionTypes = this.sections.map(
            section => section.code?.coding?.[0]?.code
        );

        const missingMandatorySections = mandatorySections.filter(
            section => !presentSectionTypes.includes(section)
        );

        if (missingMandatorySections.length > 0) {
            throw new Error(
                `Missing mandatory IPS sections: ${missingMandatorySections.join(', ')}`
            );
        }

        return this.sections;
    }
}

// // Example Usage
// function createComprehensiveIPS() {
//     try {
//         // Create patient with full validation
//         const patient: Patient = {
//             resourceType: 'Patient',
//             id: 'example-patient',
//             identifier: [{
//                 system: 'http://example.org',
//                 value: '12345'
//             }],
//             name: [{
//                 family: 'Doe',
//                 given: ['John']
//             }],
//             gender: 'male',
//             birthDate: '1980-01-01'
//         };
//
//         // Validate patient
//         IPSResourceProfileRegistry.validateResource(
//             patient,
//             IPSMandatorySections.PATIENT
//         );
//
//         // Create comprehensive IPS
//         const ipsBuilder = new ComprehensiveIPSCompositionBuilder(patient);
//
//         // Add sections with validation
//         ipsBuilder
//             .addSection(IPSMandatorySections.ALLERGIES, allergies)
//             .addSection(IPSMandatorySections.MEDICATIONS, medications)
//             .addSection(IPSMandatorySections.PROBLEMS, conditions)
//             .addSection(IPSMandatorySections.IMMUNIZATIONS, immunizations)
//             // Optional sections
//             .addSection(IPSRecommendedSections.LABORATORY_RESULTS, labResults)
//             .addSection(IPSRecommendedSections.VITAL_SIGNS, vitalSigns);
//
//         // Build final composition
//         const ipsSections = ipsBuilder.build();
//
//     } catch (error) {
//         console.error('IPS Creation Error:', error);
//     }
// }