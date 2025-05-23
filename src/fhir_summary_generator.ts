// Comprehensive IPS Resource Mapping
import Resource = fhir.Resource;
import Patient = fhir.Patient;
import CompositionSection = fhir.CompositionSection;
import {IPSMandatorySections} from "./ips_mandatory_sections";
import {IPSResourceProfileRegistry} from "./ips_resource_profile_registry";

export class ComprehensiveIPSCompositionBuilder {
    private patient: Patient;
    private sections: CompositionSection[] = [];

    constructor(patient: Patient) {
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
    addSection<T extends Resource>(
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
        // (Similar to previous implementation)

        return this;
    }

    // Comprehensive build method
    build(): CompositionSection[] {
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