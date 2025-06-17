// Comprehensive IPS Resource Mapping
import {TPatient} from "../types/resources/Patient";
import {TCompositionSection} from "../types/partials/CompositionSection";
import {TDomainResource} from "../types/resources/DomainResource";
import {IPSSections} from "../structures/ips_sections";
import {IPS_SECTION_DISPLAY_NAMES, IPS_SECTION_LOINC_CODES} from "../structures/ips_section_loinc_codes";
import {TBundle} from "../types/resources/Bundle";
import {TComposition} from "../types/resources/Composition";
import {TNarrative} from "../types/partials/Narrative";
import {IPSSectionResourceHelper} from "../structures/ips_section_resource_map";
import {NarrativeGenerator} from "./narrative_generator";


export class ComprehensiveIPSCompositionBuilder {
    private readonly patient: TPatient;
    private sections: TCompositionSection[] = [];
    private mandatorySectionsAdded: Set<IPSSections> = new Set();
    private resources: Set<TDomainResource> = new Set();

    constructor(patient: TPatient) {
        this.patient = patient;

        // Add patient section by default
        this.addPatientSection();
    }

    // Add patient section with standard LOINC code
    private addPatientSection(): this {
        // this.sections.push({
        //     title: 'Patient Demographics',
        //     code: {
        //         coding: [{
        //             system: 'http://loinc.org',
        //             code: IPS_SECTION_LOINC_CODES[IPSSections.PATIENT],
        //             display: 'Patient Demographics'
        //         }]
        //     },
        //     entry: [{
        //         reference: `Patient/${this.patient.id}`,
        //         display: 'Patient Details'
        //     }]
        // });
        // this.mandatorySectionsAdded.add(IPSSections.PATIENT);
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
        const validResources = resources;

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

        // Patient resource does not get a section, it is handled separately
        if (sectionType !== IPSSections.PATIENT) {
            // Create section entry
            const narrative: TNarrative | undefined = NarrativeGenerator.generateNarrative(sectionType, validResources);
            const sectionEntry: TCompositionSection = {
                title: IPS_SECTION_DISPLAY_NAMES[sectionType] || sectionType,
                code: {
                    coding: [{
                        system: 'http://loinc.org',
                        code: options?.customLoincCode || IPS_SECTION_LOINC_CODES[sectionType],
                        display: IPS_SECTION_DISPLAY_NAMES[sectionType] || sectionType
                    }],
                    text: IPS_SECTION_DISPLAY_NAMES[sectionType] || sectionType
                },
                text: narrative,
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
        }
        return this;
    }

    read_bundle(bundle: TBundle): this {
        if (!bundle.entry) {
            return this;
        }
        // find resources for each section in IPSSections and add the section
        for (const sectionType of Object.values(IPSSections)) {
            const resourceTypesForSection = IPSSectionResourceHelper.getResourceTypesForSection(sectionType);
            const customFilter = IPSSectionResourceHelper.getResourceFilterForSection(sectionType);
            let resources = bundle.entry
                .map(e => e.resource)
                .filter(r => typeof r?.resourceType === 'string' && resourceTypesForSection.includes(r.resourceType as string));
            if (customFilter) {
                resources = resources.filter(customFilter);
            }
            if (resources.length > 0) {
                this.addSection(sectionType, resources as TDomainResource[], {isOptional: true});
            }
        }
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

    build_bundle(authorOrganizationId: string, authorOrganizationName: string, baseUrl: string): TBundle {
        if (baseUrl.endsWith('/')) {
            baseUrl = baseUrl.slice(0, -1); // Remove trailing slash if present
        }
        // Create the Composition resource
        const composition: TComposition = {
            id: `Composition-${this.patient.id}`,
            resourceType: 'Composition',
            status: 'final',
            type: {
                coding: [{
                    system: 'http://loinc.org',
                    code: '60591-5',
                    display: 'Patient summary Document'
                }]
            },
            subject: {
                reference: `Patient/${this.patient.id}`
            },
            author: [{
                reference: `Organization/${authorOrganizationId}`, // Assuming patient is also a practitioner for simplicity
                display: authorOrganizationName
            }],
            date: new Date().toISOString(),
            title: 'International Patient Summary',
            section: this.sections,
            text: this.createCompositionNarrative()
        };

        // Create the bundle with proper document type
        const bundle: TBundle = {
            resourceType: 'Bundle',
            type: 'document',
            timestamp: new Date().toISOString(),
            identifier: {
                "system": "urn:ietf:rfc:3986",
                "value": "urn:uuid:4dcfd353-49fd-4ab0-b521-c8d57ced74d6"
            },
            entry: []
        };

        // Add Composition as first entry
        bundle.entry?.push({
            fullUrl: `${baseUrl}/Composition/${composition.id}`,
            resource: composition
        });

        // Add patient as second entry
        bundle.entry?.push({
            fullUrl: `${baseUrl}/Patient/${this.patient.id}`,
            resource: this.patient
        });

        // Extract and add all resources referenced in sections
        this.resources.forEach(resource => {
            if (resource.resourceType !== "Patient") {
                bundle.entry?.push(
                    {
                        fullUrl: `${baseUrl}/${resource.resourceType}/${resource.id}`,
                        resource: resource
                    }
                );
            }
        });

        // add a bundle entry for Organization
        bundle.entry?.push({
            fullUrl: `${baseUrl}/Organization/${authorOrganizationId}`,
            resource: {
                resourceType: 'Organization',
                id: authorOrganizationId,
                name: authorOrganizationName
            }
        });

        return bundle;
    }

    private createCompositionNarrative(): TNarrative {
        const patient = this.patient;
        let fullNarrativeContent: string = ";"
        // generate narrative for the patient
        const patientNarrative: string | undefined = NarrativeGenerator.generateNarrativeContent(
            IPSSections.PATIENT,
            [patient]
        );
        fullNarrativeContent = fullNarrativeContent.concat(patientNarrative || '');

        // now generate narrative for the sections and add to this narrative
        for (const sectionType of Object.values(IPSSections)) {
            const resourceTypesForSection = IPSSectionResourceHelper.getResourceTypesForSection(sectionType);
            const allResources = Array.from(this.resources);
            const resources = allResources
                .filter(r => resourceTypesForSection.includes(r.resourceType as string));

            if (resources.length > 0) {
                const sectionNarrative: string | undefined = NarrativeGenerator.generateNarrativeContent(sectionType, resources);
                fullNarrativeContent = fullNarrativeContent.concat(sectionNarrative || '');
            }
        }

        return {
            status: 'generated',
            div: NarrativeGenerator.wrapInXhtml(fullNarrativeContent)
        }
    }
}
