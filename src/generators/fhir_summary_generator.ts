// Comprehensive IPS Resource Mapping
import {IPSResourceProfileRegistry} from "../profiles/ips_resource_profile_registry";
import {TPatient} from "../types/resources/Patient";
import {TCompositionSection} from "../types/partials/CompositionSection";
import {TDomainResource} from "../types/resources/DomainResource";
import {IPSSections} from "../structures/ips_sections";


// LOINC Codes for IPS Sections
const LOINC_CODES: Record<IPSSections, string> = {
    [IPSSections.PATIENT]: '54126-4',
    [IPSSections.ALLERGIES]: '48765-2',
    [IPSSections.MEDICATIONS]: '10160-0',
    [IPSSections.PROBLEMS]: '11450-4',
    [IPSSections.IMMUNIZATIONS]: '11369-6',
    [IPSSections.VITAL_SIGNS]: '8716-3',
    [IPSSections.MEDICAL_DEVICES]: '46264-8',
    [IPSSections.LABORATORY_RESULTS]: '30954-2',
    [IPSSections.DIAGNOSTIC_REPORTS]: '30954-2',
    [IPSSections.PROCEDURES]: '47519-4',
    [IPSSections.FAMILY_HISTORY]: '10157-6',
    [IPSSections.SOCIAL_HISTORY]: '29762-2',
    [IPSSections.PREGNANCY_HISTORY]: '10162-6',
    [IPSSections.FUNCTIONAL_STATUS]: '47420-5',
    [IPSSections.MEDICAL_HISTORY]: '11348-0',
    [IPSSections.CARE_PLAN]: '18776-5',
    [IPSSections.CLINICAL_IMPRESSION]: '51848-0'
};

export class ComprehensiveIPSCompositionBuilder {
    private patient: TPatient;
    private sections: TCompositionSection[] = [];
    private mandatorySectionsAdded: Set<IPSSections> = new Set();

    constructor(patient: TPatient) {
        // Validate patient resource
        if (!IPSResourceProfileRegistry.validateResource(
            patient,
            IPSSections.PATIENT
        )) {
            throw new Error('Patient resource does not meet IPS requirements');
        }
        this.patient = patient;

        // Add patient section by default
        this.addPatientSection();
    }

    // Add patient section with standard LOINC code
    private addPatientSection(): this {
        this.sections.push({
            code: {
                coding: [{
                    system: 'http://loinc.org',
                    code: LOINC_CODES[IPSSections.PATIENT],
                    display: 'Patient Demographics'
                }]
            },
            entry: [{
                reference: `Patient/${this.patient.id}`,
                display: 'Patient Details'
            }]
        });
        this.mandatorySectionsAdded.add(IPSSections.PATIENT);
        return this;
    }

    // Comprehensive method to add sections with validation
    addSection<T extends TDomainResource>(
        sectionType: IPSSections,
        resources: T[],
        options?: {
            isOptional?: boolean;
            customLoincCode?: string;
        }
    ): this {
        // Validate resources
        const validResources = resources.filter(resource =>
            IPSResourceProfileRegistry.validateResource(resource, sectionType)
        );

        // Skip if no valid resources and not mandatory
        if (validResources.length === 0) {
            if (!options?.isOptional) {
                throw new Error(`No valid resources for mandatory section: ${sectionType}`);
            }
            return this;
        }

        // Create section entry
        const sectionEntry: TCompositionSection = {
            code: {
                coding: [{
                    system: 'http://loinc.org',
                    code: options?.customLoincCode || LOINC_CODES[sectionType],
                    display: `Section for ${sectionType}`
                }]
            },
            entry: validResources.map(resource => ({
                reference: `${resource.resourceType}/${resource.id}`,
                display: resource.resourceType
            }))
        };

        // Track mandatory sections
        if (!options?.isOptional) {
            this.mandatorySectionsAdded.add(sectionType);
        }

        this.sections.push(sectionEntry);
        return this;
    }

    // Comprehensive build method with validation
    build(): TCompositionSection[] {
        // Ensure all mandatory sections are present
        const mandatorySections = [
            IPSSections.ALLERGIES,
            IPSSections.MEDICATIONS,
            IPSSections.PROBLEMS,
            IPSSections.IMMUNIZATIONS
        ];

        const missingMandatorySections = mandatorySections.filter(
            section => !this.mandatorySectionsAdded.has(section)
        );

        if (missingMandatorySections.length > 0) {
            throw new Error(
                `Missing mandatory IPS sections: ${missingMandatorySections.join(', ')}`
            );
        }

        return this.sections;
    }
}
