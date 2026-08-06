// Comprehensive IPS Resource Mapping
import { TPatient } from "../types/resources/Patient";
import { TCompositionSection } from "../types/partials/CompositionSection";
import { TDomainResource } from "../types/resources/DomainResource";
import { IPSSections } from "../structures/ips_sections";
import { IPS_SECTION_DISPLAY_NAMES, IPS_SECTION_LOINC_CODES } from "../structures/ips_section_loinc_codes";
import { TBundle } from "../types/resources/Bundle";
import { TComposition } from "../types/resources/Composition";
import { TNarrative } from "../types/partials/Narrative";
import { IPSSectionResourceHelper } from "../structures/ips_section_resource_map";
import { NarrativeGenerator } from "./narrative_generator";
import { IPSMissingMandatorySectionContent } from "../structures/ips_mandatory_sections";
import { MAX_ENTRIES_PER_GROUP } from "../structures/ips_section_constants";

/**
 * A summary Composition's own sub-sections, as ordered reference lists — one
 * "group" each. For sections built from a grouped Composition (e.g. device
 * metrics, one sub-section per metric) this is what a per-group cap slices.
 * Compositions with no sub-sections yield a single group holding their
 * top-level entries, so callers can treat both shapes uniformly.
 */
function summaryCompositionGroups(summaryComposition: TComposition): string[][] {
    const toReferences = (entries: TCompositionSection['entry']): string[] =>
        (entries ?? [])
            .map(entry => entry.reference)
            .filter((reference): reference is string => Boolean(reference));

    const subSections = summaryComposition?.section ?? [];
    const groups = subSections.map(section => toReferences(section.entry));
    return groups.length > 0 ? groups : [[]];
}

/**
 * Takes at most `maxEntriesPerGroup` items from each group, in order,
 * de-duplicated across the whole Composition.
 *
 * References that `resolve` returns undefined for do NOT count toward the cap:
 * a summary Composition routinely references resources absent from the bundle
 * being built (a different time window, deleted resources), and counting those
 * would let a group silently contribute far fewer than the cap allows.
 * Passing `maxEntriesPerGroup` as undefined takes everything.
 */
function takeCappedPerGroup<T>(
    groups: string[][],
    maxEntriesPerGroup: number | undefined,
    resolve: (reference: string) => T | undefined,
): T[] {
    const taken: T[] = [];
    const seen = new Set<string>();
    for (const group of groups) {
        let takenFromGroup = 0;
        for (const reference of group) {
            if (maxEntriesPerGroup !== undefined && takenFromGroup >= maxEntriesPerGroup) break;
            if (seen.has(reference)) continue;
            const resolved = resolve(reference);
            if (resolved === undefined) continue;
            taken.push(resolved);
            seen.add(reference);
            takenFromGroup++;
        }
    }
    return taken;
}

/**
 * Turns a `ResourceType/id` reference into a placeholder resource, used by the
 * summary-composition-only mode where the real resources aren't loaded.
 * Returns undefined for anything that isn't exactly two segments.
 */
function referenceToStubResource(reference: string): TDomainResource | undefined {
    const parts = reference.split('/');
    return parts.length === 2 ? { resourceType: parts[0], id: parts[1] } : undefined;
}

export class ComprehensiveIPSCompositionBuilder {
    private patients: TPatient[] | undefined;
    private sections: TCompositionSection[] = [];
    private resources: Set<TDomainResource> = new Set();
    private patientSummary: TNarrative | undefined;

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
        if (sectionType === IPSSections.PATIENT) {
            this.patientSummary = narrative;
            return this;
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
        if (!narrative && sectionType in IPSMissingMandatorySectionContent) {
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
        return this;
    }

    async makeSectionFromSummaryAsync(
        sectionType: IPSSections,
        summaryCompositions: TComposition[],
        resources: TDomainResource[],
        timezone: string | undefined,
        includeSummaryCompositionOnly: boolean = false,
        maxEntriesPerGroup?: number,
    ): Promise<this> {
        const sectionResources: TDomainResource[] = [];
        for (const summaryComposition of summaryCompositions) {
            const resourceEntries = summaryComposition?.section?.flatMap(sec => sec.entry || []) ?? [];
            const groups = summaryCompositionGroups(summaryComposition);
            if (includeSummaryCompositionOnly) {
                // Stub-only mode: the bundle isn't consulted, so each reference
                // becomes a placeholder. The cap still applies here — this mode
                // is reachable in production via
                // `$summary?_includeSummaryCompositionOnly=true`.
                sectionResources.push(
                    ...takeCappedPerGroup(groups, maxEntriesPerGroup, referenceToStubResource)
                );
            }
            else if (maxEntriesPerGroup !== undefined) {
                // Bounded path: walks entry order rather than bundle order so
                // the upstream most-recent-first sorting within each group is
                // preserved when the cap slices it.
                const resourcesByReference = new Map<string, TDomainResource>();
                for (const resource of resources) {
                    resourcesByReference.set(`${resource.resourceType}/${resource.id}`, resource);
                }
                const resolved = takeCappedPerGroup(
                    groups, maxEntriesPerGroup, reference => resourcesByReference.get(reference)
                );
                for (const resource of resolved) {
                    this.resources.add(resource);
                }
                sectionResources.push(...resolved);
            }
            else {
                resources.forEach(resource => {
                    if (resourceEntries?.some(entry => entry.reference === `${resource.resourceType}/${resource.id}`)) {
                        this.resources.add(resource);
                        sectionResources.push(resource);
                    }
                });
            }
        }

        let narrative = await NarrativeGenerator.generateNarrativeAsync(
            sectionType,
            summaryCompositions,
            timezone,
            true,
            true
        );
        if (!narrative && sectionType in IPSMissingMandatorySectionContent) {
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
     * @param includeSummaryCompositionOnly - Whether to include only summary composition resources (default: false)
     * @param consoleLogger - Optional console logger for logging (default: console)
     */
    async readBundleAsync(
        bundle: TBundle,
        timezone: string | undefined,
        useSummaryCompositions: boolean = false,
        includeSummaryCompositionOnly: boolean = false,
        consoleLogger: Console = console
    ): Promise<this> {
        if (!bundle.entry) {
            return this;
        }
        const patientEntries: TPatient[] = [];
        const resources = [] as TDomainResource[];

        // find all patient resources in the bundle
        bundle.entry.forEach(e => {
            if (e.resource) {
                if (e.resource.resourceType === 'Patient') {
                    patientEntries.push(e.resource as TPatient);
                    this.resources.add(e.resource);
                }
                resources.push(e.resource);
            }
        });

        if (patientEntries.length === 0) {
            throw new Error('Patient resource not found in the bundle');
        }

        this.patients = patientEntries;

        // find resources for each section in IPSSections and add the section
        for (const sectionType of Object.values(IPSSections)) {
            const summaryCompositionFilter = useSummaryCompositions ? IPSSectionResourceHelper.getSummaryCompositionFilterForSection(sectionType) : undefined;
            const sectionSummary = summaryCompositionFilter ? resources.filter(resource => summaryCompositionFilter(resource)) : [];
            if (sectionSummary.length > 0) {
                consoleLogger.info(`Using summary composition for section: ${sectionType}`);
                await this.makeSectionFromSummaryAsync(sectionType, sectionSummary as TComposition[], resources as TDomainResource[], timezone, includeSummaryCompositionOnly, MAX_ENTRIES_PER_GROUP[sectionType]);
            } else {
                consoleLogger.info(`Using individual resources for section: ${sectionType}`);
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
     * @param includeSummaryCompositionOnly - Whether to include only summary composition resources (default: false)
     * @param patientId - Optional patient ID to use as primary patient for composition reference
     * @param now - Optional current date to use for composition date (defaults to new Date())
     */
    async buildBundleAsync(
        authorOrganizationId: string,
        authorOrganizationName: string,
        baseUrl: string,
        timezone: string | undefined,
        includeSummaryCompositionOnly: boolean = false,
        patientId?: string,
        now?: Date
    ): Promise<TBundle> {
        if (baseUrl.endsWith('/')) {
            baseUrl = baseUrl.slice(0, -1); // Remove trailing slash if present
        }
        if (!this.patients) {
            throw new Error('Patient resource must be set before building the bundle');
        }
        if (!this.patientSummary) {
            throw new Error('Patient summary narrative must be set before building the bundle');
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
            text: this.patientSummary
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

        if (!includeSummaryCompositionOnly) {
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
        }

        return bundle;
    }

    /**
     * Returns the Composition sections without creating a full bundle.
     * @returns Array of TCompositionSection
     */
    getSections(): TCompositionSection[] {
        return this.sections;
    }

    /**
     * Identifies remaining resource types that are missing from the composition bundle.
     * @param bundle - FHIR Bundle containing resources
     * @returns Array of missing resource type strings
     */
    getRemainingResourcesFromCompositionBundle(
        bundle: TBundle
    ): string[] {

        const resources = [] as TDomainResource[];

        bundle.entry?.forEach(e => {
            if (e.resource) {
                resources.push(e.resource);
            }
        });

        const remainingResources = new Set<string>()

        for (const sectionType of Object.values(IPSSections)) {
            const summaryCompositionFilter = IPSSectionResourceHelper.getSummaryCompositionFilterForSection(sectionType);
            const sectionSummary = summaryCompositionFilter ? resources.filter(resource => summaryCompositionFilter(resource)) : [];
            if (sectionSummary.length === 0) {
                const resourcesForSection = IPSSectionResourceHelper.getResourceTypesForSection(sectionType);
                resourcesForSection.forEach((resourceType) => {
                    if (!remainingResources.has(resourceType) && !resources.some(r => r.resourceType === resourceType)) {
                        remainingResources.add(resourceType);
                    }
                });
            }

        }

        return Array.from(remainingResources);
    }
}
