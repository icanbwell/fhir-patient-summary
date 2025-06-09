// Comprehensive IPS Resource Mapping
import {IPSResourceProfileRegistry} from "../profiles/ips_resource_profile_registry";
import {TPatient} from "../types/resources/Patient";
import {TCompositionSection} from "../types/partials/CompositionSection";
import {TDomainResource} from "../types/resources/DomainResource";
import {IPSSections} from "../structures/ips_sections";
import {IPS_SECTION_LOINC_CODES} from "../structures/ips_section_loinc_codes";
import {TBundle} from "../types/resources/Bundle";


export class ComprehensiveIPSCompositionBuilder {
    private readonly patient: TPatient;
    private sections: TCompositionSection[] = [];
    private mandatorySectionsAdded: Set<IPSSections> = new Set();
    private resources: Set<TDomainResource> = new Set();

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

        for (const resource of validResources) {
            // Add resource to the internal set
            this.resources.add(resource);
        }

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
        // Create the Composition resource
        const composition = {
            resourceType: 'Composition',
            status: 'final',
            type: {
                coding: [{
                    system: 'http://loinc.org',
                    code: '60591-5',
                    display: 'International Patient Summary'
                }]
            },
            subject: {
                reference: `Patient/${this.patient.id}`
            },
            date: new Date().toISOString(),
            title: 'International Patient Summary',
            section: this.sections
        };

        // Create the bundle with proper document type
        const bundle: TBundle = {
            resourceType: 'Bundle',
            type: 'document',
            timestamp: new Date().toISOString(),
            entry: []
        };

        // Add Composition as first entry
        bundle.entry = [{
            fullUrl: `urn:uuid:${crypto.randomUUID()}`,
            resource: composition
        }];
        if (bundle.entry) {
            // Add patient as second entry
            bundle.entry.push({
                fullUrl: `Patient/${this.patient.id}`,
                resource: this.patient
            });

            // Extract and add all resources referenced in sections
            this.resources.forEach(resource => {
                bundle.entry?.push(
                    {
                        fullUrl: `urn:uuid:${crypto.randomUUID()}`,
                        resource: resource
                    }
                )
            });
        }

        return bundle;
    }
}
