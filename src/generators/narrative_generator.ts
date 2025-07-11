// TypeScriptNarrativeGenerator.ts - TypeScript replacement for narrative_generator.ts using TypeScript templates

import {TDomainResource} from "../types/resources/DomainResource";
import {IPSSections} from "../structures/ips_sections";
import {TypeScriptTemplateMapper} from "../narratives/templates/typescript/TypeScriptTemplateMapper";
import {TBundle} from "../types/resources/Bundle";

export interface Narrative {
    status: 'generated' | 'extensions' | 'additional' | 'empty';
    div: string; // XHTML div content
}

/**
 * Generates narrative content for FHIR resources using TypeScript templates
 * Replaces the Nunjucks-based narrative generator
 */
export class NarrativeGenerator {
    /**
     * Generates narrative HTML content for a section
     * @param section - IPS section type
     * @param resources - Array of domain resources
     * @param timezone - Optional timezone to use for date formatting (e.g., 'America/New_York', 'Europe/London')
     * @returns Generated HTML content or undefined if no resources
     */
    static generateNarrativeContent<T extends TDomainResource>(
        section: IPSSections,
        resources: T[],
        timezone: string | undefined
    ): string | undefined {
        if (!resources || resources.length === 0) {
            return undefined; // No resources to generate narrative
        }

        try {
            // Create a bundle-like structure for the template
            const bundle: TBundle = {
                resourceType: 'Bundle',
                type: 'collection',
                entry: resources.map(resource => ({
                    resource
                }))
            };

            // Use the TypeScript template mapper to generate HTML
            return TypeScriptTemplateMapper.generateNarrative(section, bundle, timezone);
        } catch (error) {
            console.error(`Error generating narrative for section ${section}:`, error);
            return `<div class="error">Error generating narrative: ${error instanceof Error ? error.message : String(error)}</div>`;
        }
    }

    /**
     * Creates a complete FHIR Narrative object
     * @param content - HTML content
     * @returns FHIR Narrative object
     */
    static createNarrative(content: string): Narrative {
        // remove extra whitespace and newlines
        content = content.replace(/\s+/g, ' ').trim();
                // Strip outer <div> wrappers if present
        const divMatch = content.match(/^<div[^>]*>(.*?)<\/div>$/);
        if (divMatch) {
            content = divMatch[1]; // Extract inner content
        }
        return {
            status: 'generated',
            div: `<div xmlns="http://www.w3.org/1999/xhtml">${content}</div>`
        };
    }

    /**
     * Generates a complete FHIR Narrative object for a section
     * @param section - IPS section type
     * @param resources - Array of domain resources
     * @param timezone - Optional timezone to use for date formatting (e.g., 'America/New_York', 'Europe/London')
     * @returns FHIR Narrative object or undefined if no resources
     */
    static generateNarrative<T extends TDomainResource>(
        section: IPSSections,
        resources: T[],
        timezone: string | undefined
    ): Narrative | undefined {
        const content = this.generateNarrativeContent(section, resources, timezone);
        if (!content) {
            return undefined;
        }
        return this.createNarrative(content);
    }

    /**
     * Wrap content in XHTML div with FHIR namespace
     * @param content - HTML content to wrap
     * @returns XHTML div string
     */
    static wrapInXhtml(content: string): string {
        return `<div xmlns="http://www.w3.org/1999/xhtml">${content}</div>`;
    }
}
