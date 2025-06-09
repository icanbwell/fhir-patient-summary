// Comprehensive IPS Resource Mapping
import {IPSResourceProfileRegistry} from "../profiles/ips_resource_profile_registry";
import {TPatient} from "../types/resources/Patient";
import {TCompositionSection} from "../types/partials/CompositionSection";
import {TDomainResource} from "../types/resources/DomainResource";
import {IPSSections} from "../structures/ips_sections";
import {IPS_SECTION_LOINC_CODES} from "../structures/ips_section_loinc_codes";
import {TBundle} from "../types/resources/Bundle";


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
                    code: IPS_SECTION_LOINC_CODES[IPSSections.PATIENT],
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
                    code: options?.customLoincCode || IPS_SECTION_LOINC_CODES[sectionType],
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

    build_bundle(): TBundle {
        const bundle: TBundle = {
            resourceType: 'Bundle',
            type: 'collection',
            entry: this.sections.map(section => ({
                resource: {
                    ...section,
                    resourceType: 'CompositionSection'
                }
            })) || []
        };

        if (bundle.entry) {
            // Add patient as the first entry
            bundle.entry.unshift({
                resource: this.patient
            });
        }

        return bundle;
    }
}
