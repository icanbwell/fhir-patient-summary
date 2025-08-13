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
import { IPSMandatorySections, IPSMissingMandatorySectionContent } from "../structures/ips_mandatory_sections";


export class ComprehensiveIPSCompositionBuilder {
    private patient: TPatient | undefined;
    private sections: TCompositionSection[] = [];
    private resources: Set<TDomainResource> = new Set();

    /**
     * sets the patient resource for the IPS Composition.
     * This is not needed if you are calling read_bundle, but can be used to set the patient resource directly.
     * @param patient - FHIR Patient resource to set
     */
    setPatient(patient: TPatient): this {
        if (!patient || patient.resourceType !== 'Patient') {
            throw new Error('Invalid Patient resource');
        }
        this.patient = patient;
        return this;
    }

    /**
     * Adds a section to the composition with async HTML minification
     * @param sectionType - IPS section type
     * @param validResources - Array of domain resources
     * @param timezone - Optional timezone to use for date formatting
     */
    async addSectionAsync<T extends TDomainResource>(
        sectionType: IPSSections,
        validResources: T[],
        timezone: string | undefined
    ): Promise<this> {
        for (const resource of validResources) {
            // Add resource to the internal set
            this.resources.add(resource);
        }

        // Patient resource does not get a section, it is handled separately
        if (sectionType !== IPSSections.PATIENT) {
            let narrative: TNarrative | undefined = undefined;

            // Create section entry with HTML minification
            if (validResources.length > 0) {
              narrative = await NarrativeGenerator.generateNarrativeAsync(
                sectionType,
                validResources,
                timezone,
                true
              );
            } else if (sectionType in IPSMandatorySections) {
              narrative = await NarrativeGenerator.createNarrativeAsync(
                IPSMissingMandatorySectionContent[
                  sectionType as keyof typeof IPSMissingMandatorySectionContent
                ]
              );
            } else {
                return this; // Skip empty sections
            }

            const sectionEntry: TCompositionSection = {
                title: IPS_SECTION_DISPLAY_NAMES[sectionType] || sectionType,
                code: {
                    coding: [{
                        system: 'http://loinc.org',
                        code: IPS_SECTION_LOINC_CODES[sectionType],
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

            this.sections.push(sectionEntry);
        }
        return this;
    }

    /**
     * Reads a FHIR Bundle and extracts resources for each section defined in IPSSections.
     * @param bundle - FHIR Bundle containing resources
     * @param timezone - Optional timezone to use for date formatting
     */
    async readBundleAsync(
        bundle: TBundle,
        timezone: string | undefined,
    ): Promise<this> {
        if (!bundle.entry) {
            return this;
        }
        // find the patient resource in the bundle
        const patientEntry = bundle.entry.find(e => e.resource?.resourceType === 'Patient');
        if (!patientEntry || !patientEntry.resource) {
            throw new Error('Patient resource not found in the bundle');
        }
        this.patient = patientEntry.resource as TPatient;

        const resources = bundle.entry.map(e => e.resource);

        // find resources for each section in IPSSections and add the section
        for (const sectionType of Object.values(IPSSections)) {
            const resourceTypesForSection = IPSSectionResourceHelper.getResourceTypesForSection(sectionType);
            const customFilter = IPSSectionResourceHelper.getResourceFilterForSection(sectionType);
            
            // Filter resources by resource type first            
            let sectionResources = resources.filter(
              r =>
                r &&
                typeof r.resourceType === 'string' &&
                resourceTypesForSection.includes(r.resourceType)
            );

            // Apply custom filter if it exists
            if (customFilter) {
                sectionResources = sectionResources.filter(resource => resource && customFilter(resource));
            }
            await this.addSectionAsync(sectionType, sectionResources as TDomainResource[], timezone);
        }
        return this;
    }

    /**
     * Builds a complete FHIR Bundle containing the Composition and all resources.
     * @param authorOrganizationId - ID of the authoring organization (e.g., hospital or clinic)
     * @param authorOrganizationName - Name of the authoring organization
     * @param baseUrl - Base URL for the FHIR server (e.g., 'https://example.com/fhir')
     * @param timezone - Optional timezone to use for date formatting (e.g., 'America/New_York', 'Europe/London')
     */
    async buildBundleAsync(
        authorOrganizationId: string,
        authorOrganizationName: string,
        baseUrl: string,
        timezone: string | undefined,
    ): Promise<TBundle> {
        if (baseUrl.endsWith('/')) {
            baseUrl = baseUrl.slice(0, -1); // Remove trailing slash if present
        }
        if (!this.patient) {
            throw new Error('Patient resource must be set before building the bundle');
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
            text: await NarrativeGenerator.generateNarrativeAsync(
                IPSSections.PATIENT,
                [this.patient as TDomainResource],
                timezone,
                true
            )
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

    /**
     * Returns the Composition sections without creating a full bundle.
     * @returns Array of TCompositionSection
     */
    getSections(): TCompositionSection[] {
        return this.sections;
    }
}
