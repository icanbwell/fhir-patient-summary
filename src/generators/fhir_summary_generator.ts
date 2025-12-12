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
    private patients: TPatient[] | undefined;
    private sections: TCompositionSection[] = [];
    private resources: Set<TDomainResource> = new Set();

    /**
     * sets the patient resource for the IPS Composition.
     * This is not needed if you are calling read_bundle, but can be used to set the patient resource directly.
     * @param patients - FHIR Patient resource to set
     */
    setPatient(patients: TPatient | TPatient[]): this {
        if (!Array.isArray(patients)) {
            patients = [patients];
        }
        if (patients.length === 0 || !patients.every(patient => patient.resourceType === 'Patient')) {
            throw new Error('Invalid Patient resource');
        }
        this.patients = patients;
        return this;
    }

    /**
     * Adds a section to the composition with async HTML minification
     * @param narrative - Narrative content for the section
     * @param sectionType - IPS section type
     * @param validResources - Array of domain resources
     */
    addSectionAsync<T extends TDomainResource>(
        narrative: TNarrative,
        sectionType: IPSSections,
        validResources: T[]
    ): this {
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

        return this;
    }

    /**
     * Make and adds a section to the composition with async HTML minification
     * @param sectionType - IPS section type
     * @param validResources - Array of domain resources
     * @param timezone - Optional timezone to use for date formatting
     */
    async makeSectionAsync<T extends TDomainResource>(
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
            }
            if (!narrative && sectionType in IPSMandatorySections) {
              narrative = await NarrativeGenerator.createNarrativeAsync(
                IPSMissingMandatorySectionContent[
                  sectionType as keyof typeof IPSMissingMandatorySectionContent
                ]
              );
            }
            if (!narrative) {
                return this; // Skip empty sections
            }

            this.addSectionAsync(narrative as TNarrative, sectionType, validResources);
        }
        return this;
    }

    async makeSectionFromSummaryAsync (
        sectionType: IPSSections,
        summaryCompositions: TComposition[],
        resources: TDomainResource[],
        timezone: string | undefined
    ): Promise<this> {
        const sectionResources: TDomainResource[] = [];
        for (const summaryComposition of summaryCompositions) {
            const resourceEntries = summaryComposition?.section?.flatMap(sec => sec.entry || []) ?? [];

            resources.forEach(resource => {
                if (resourceEntries?.some(entry => entry.reference === `${resource.resourceType}/${resource.id}`)) {
                    this.resources.add(resource);
                    sectionResources.push(resource);
                }
            });
        }

        let narrative = await NarrativeGenerator.generateNarrativeAsync(
            sectionType,
            summaryCompositions,
            timezone,
            true,
            true
        );
        if (!narrative && sectionType in IPSMandatorySections) {
            narrative = await NarrativeGenerator.createNarrativeAsync(
                IPSMissingMandatorySectionContent[
                    sectionType as keyof typeof IPSMissingMandatorySectionContent
                ]
            );
        }
        if (!narrative) {
            return this; // Skip empty sections
        }

        this.addSectionAsync(narrative as TNarrative, sectionType, sectionResources);
        return this;
    }

    /**
     * Reads a FHIR Bundle and extracts resources for each section defined in IPSSections.
     * @param bundle - FHIR Bundle containing resources
     * @param timezone - Optional timezone to use for date formatting
     * @param useSummaryCompositions - Whether to use summary compositions (default: false)
     */
    async readBundleAsync(
        bundle: TBundle,
        timezone: string | undefined,
        useSummaryCompositions: boolean = false,
    ): Promise<this> {
        if (!bundle.entry) {
            return this;
        }
        const patientEntries: TPatient[] = [];
        const resources = [] as TDomainResource[];

        // find all patient resources in the bundle
        bundle.entry.forEach(e => {
            if (e.resource?.resourceType === 'Patient') {
                patientEntries.push(e.resource as TPatient);
                this.resources.add(e.resource);
            } else if (e.resource) {
                resources.push(e.resource);
            }
        });

        if (patientEntries.length === 0) {
            throw new Error('Patient resource not found in the bundle');
        }

        this.patients = patientEntries;

        // find resources for each section in IPSSections and add the section
        for (const sectionType of Object.values(IPSSections)) {
            if (sectionType === IPSSections.PATIENT) {
                continue; // Patient section is handled separately
            }
            const summaryIPSCompositionFilter = useSummaryCompositions ? IPSSectionResourceHelper.getSummaryIPSCompositionFilterForSection(sectionType) : undefined;
            const sectionIPSSummary = summaryIPSCompositionFilter ? resources.filter(resource => summaryIPSCompositionFilter(resource)) : [];
            if (sectionIPSSummary.length > 0) {
                await this.makeSectionFromSummaryAsync(sectionType, sectionIPSSummary as TComposition[], resources as TDomainResource[], timezone);
                continue;
            }
            const summaryCompositionFilter = useSummaryCompositions ? IPSSectionResourceHelper.getSummaryCompositionFilterForSection(sectionType) : undefined;
            const sectionSummary = summaryCompositionFilter ? resources.filter(resource => summaryCompositionFilter(resource)) : [];
            if (sectionSummary.length > 0) {
                await this.makeSectionFromSummaryAsync(sectionType, sectionSummary as TComposition[], resources as TDomainResource[], timezone);
            } else {
                const sectionFilter = IPSSectionResourceHelper.getResourceFilterForSection(sectionType);
                const sectionResources = resources.filter(resource => sectionFilter(resource));
                await this.makeSectionAsync(sectionType, sectionResources as TDomainResource[], timezone);
            }
        }
        return this;
    }

    /**
     * Builds a complete FHIR Bundle containing the Composition and all resources.
     * @param authorOrganizationId - ID of the authoring organization (e.g., hospital or clinic)
     * @param authorOrganizationName - Name of the authoring organization
     * @param baseUrl - Base URL for the FHIR server (e.g., 'https://example.com/fhir')
     * @param timezone - Optional timezone to use for date formatting (e.g., 'America/New_York', 'Europe/London')
     * @param patientId - Optional patient ID to use as primary patient for composition reference
     * @param now - Optional current date to use for composition date (defaults to new Date())
     */
    async buildBundleAsync(
        authorOrganizationId: string,
        authorOrganizationName: string,
        baseUrl: string,
        timezone: string | undefined,
        patientId?: string,
        now?: Date
    ): Promise<TBundle> {
        if (baseUrl.endsWith('/')) {
            baseUrl = baseUrl.slice(0, -1); // Remove trailing slash if present
        }
        if (!this.patients) {
            throw new Error('Patient resource must be set before building the bundle');
        }
        
        // For multiple patients, use the specified patientId or the first patient as primary
        const primaryPatientId = patientId ?? this.patients[0].id;

        // Create the Composition resource
        const composition: TComposition = {
            id: `Composition-${primaryPatientId}`,
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
                reference: `Patient/${primaryPatientId}`
            },
            author: [{
                reference: `Organization/${authorOrganizationId}`, // Assuming patient is also a practitioner for simplicity
                display: authorOrganizationName
            }],
            date: (now || new Date()).toISOString(),
            title: 'International Patient Summary',
            section: this.sections,
            text: await NarrativeGenerator.generateNarrativeAsync(
                IPSSections.PATIENT,
                this.patients,
                timezone,
                true,
                false,
                now
            )
        };

        // Create the bundle with proper document type
        const bundle: TBundle = {
            resourceType: 'Bundle',
            type: 'document',
            timestamp: (now || new Date()).toISOString(),
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

        // Add patient entries
        this.patients.forEach(patient => {
            bundle.entry?.push({
                fullUrl: `${baseUrl}/Patient/${patient.id}`,
                resource: patient
            });
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
