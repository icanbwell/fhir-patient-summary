import {TDomainResource} from "../types/resources/DomainResource";
import {TObservation} from "../types/resources/Observation";
import {TCodeableConcept} from "../types/partials/CodeableConcept";
import nunjucks from "nunjucks";
import path from "path";
import {IPSSections} from "../structures/ips_sections";
import {IPSTemplateMapper} from "../narratives/IPSTemplateMapper";

interface Narrative {
    status: 'generated' | 'extensions' | 'additional' | 'empty';
    div: string; // XHTML div content
}

class NarrativeGenerator {

    static generateNarrativeContent<T extends TDomainResource>(
        section: IPSSections,
        resources: T[]
    ): string | undefined {
        if (!resources || resources.length === 0) {
            return undefined; // No resources to generate narrative
        }

        // HAPI example templates: https://github.com/hapifhir/hapi-fhir/tree/master/hapi-fhir-jpaserver-ips/src/main/resources/ca/uhn/fhir/jpa/ips/narrative

        const env = nunjucks.configure(path.join(__dirname, '../narratives/templates/jinja2'), {
            autoescape: false,
            noCache: false
        });
        // get the template name based on section
        const templateName = IPSTemplateMapper.getTemplate(section);
        if (!templateName) {
            throw new Error(`No template found for section: ${section}`);
        }
        // Check if the template exists
        if (!env.getTemplate(templateName, true)) {
            throw new Error(`Template not found: ${templateName}`);
        }
        // Create a bundle-like structure for the template
        const bundle: Record<string, any> = {
            resourceType: 'Bundle',
            type: 'document',
            entry: resources.map(resource => ({
                resource,
                fullUrl: `urn:uuid:${resource.id}`
            }))
        };
        const content = env.render(templateName, { resource: bundle });

        return content.replace(/\n/g, '');
    }

    /**
     * Generate a narrative for any FHIR resource
     * @param resources - FHIR resources
     * @param section - IPS section type
     * @returns Narrative representation
     */
    static generateNarrative<T extends TDomainResource>(
        section: IPSSections,
        resources: T[]
    ): Narrative | undefined {

        const content = this.generateNarrativeContent(section, resources);
        if (content === undefined) {
            return content;
        }
        return {
            status: 'generated',
            div: NarrativeGenerator.wrapInXhtml(content)
        };
    }

    /**
     * Wrap content in XHTML div with FHIR namespace
     * @param content - HTML content to wrap
     * @returns XHTML div string
     */
    static wrapInXhtml(content: string): string {
        return `<div xmlns="http://www.w3.org/1999/xhtml">${content}</div>`;
    }


    /**
     * Format identifiers
     * @param identifiers - Array of identifiers
     * @returns Formatted identifier string
     */
    private static formatIdentifiers(
        identifiers?: Array<{
            system?: string;
            value?: string;
        }>
    ): string {
        if (!identifiers || identifiers.length === 0) return '';

        return identifiers
            .map(id => `${id.system || 'Unknown'}: ${id.value || 'N/A'}`)
            .join(', ');
    }

    /**
     * Format CodeableConcept
     * @param concept - CodeableConcept
     * @returns Formatted concept string
     */
    private static formatCodeableConcept(
        concept?: TCodeableConcept
    ): string {
        if (!concept) return 'Not specified';

        return concept.text ||
            concept.coding?.[0]?.display ||
            concept.coding?.[0]?.code ||
            'Unknown';
    }

    /**
     * Format observation value
     * @param observation - Observation resource
     * @returns Formatted value string
     */
    private static formatObservationValue(
        observation: TObservation
    ): string {
        if (observation.valueQuantity) {
            const {value, unit} = observation.valueQuantity;
            return value ? `${value} ${unit || ''}`.trim() : 'No value';
        }

        return 'Not specified';
    }

    /**
     * Format allergy reactions
     * @param reactions - Allergy reactions
     * @returns Formatted reactions string
     */
    private static formatReactions(
        reactions?: Array<{
            manifestation?: TCodeableConcept[];
            severity?: string;
        }>
    ): string {
        if (!reactions || reactions.length === 0) return '';

        return reactions
            .map(reaction => {
                const manifestations = reaction.manifestation
                    ?.map(m => NarrativeGenerator.formatCodeableConcept(m))
                    .join(', ') || 'Unknown';

                return `${manifestations} (${reaction.severity || 'Unknown Severity'})`;
            })
            .join('; ');
    }
}

export {NarrativeGenerator, Narrative};