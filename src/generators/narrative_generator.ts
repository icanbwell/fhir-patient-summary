// TypeScriptNarrativeGenerator.ts - TypeScript replacement for narrative_generator.ts using TypeScript templates

import {TDomainResource} from "../types/resources/DomainResource";
import {IPSSections} from "../structures/ips_sections";
import {TypeScriptTemplateMapper} from "../narratives/templates/typescript/TypeScriptTemplateMapper";
import { minify as htmlMinify } from 'html-minifier-terser';

export interface Narrative {
    status: 'generated' | 'extensions' | 'additional' | 'empty';
    div: string; // XHTML div content
}

// Default minification options
const DEFAULT_MINIFY_OPTIONS = {
    collapseWhitespace: true,
    conservativeCollapse: true, // Preserves one whitespace
    removeComments: true,
    caseSensitive: true, // Important for XML/XHTML
    minifyCSS: true,
    minifyJS: false,
    decodeEntities: true,
    keepClosingSlash: true, // Important for XML/XHTML
    removeEmptyAttributes: true
};

// Aggressive minification options
const AGGRESSIVE_MINIFY_OPTIONS = {
    ...DEFAULT_MINIFY_OPTIONS,
    collapseWhitespace: true,
    conservativeCollapse: false, // Don't preserve whitespace
    removeAttributeQuotes: true,
    removeRedundantAttributes: true,
    removeEmptyElements: false, // Don't remove empty elements as they may be semantically important
    removeOptionalTags: true
};

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
    static async generateNarrativeContentAsync<T extends TDomainResource>(
        section: IPSSections,
        resources: T[],
        timezone: string | undefined,
    ): Promise<string | undefined> {
        if (!resources || resources.length === 0) {
            return undefined; // No resources to generate narrative
        }

        try {
            // Use the TypeScript template mapper to generate HTML
            const content: string = TypeScriptTemplateMapper.generateNarrative(section, resources, timezone);
            if (!content) {
                return undefined; // No content generated
            }
            return content;
        } catch (error) {
            console.error(`Error generating narrative for section ${section}:`, error);
            return `<div class="error">Error generating narrative: ${error instanceof Error ? error.message : String(error)}</div>`;
        }
    }

    /**
     * Minifies HTML content asynchronously using html-minifier-terser
     * @param html - HTML content to minify
     * @param aggressive - Whether to use more aggressive minification
     * @returns Promise that resolves to minified HTML content
     */
    static async minifyHtmlAsync(html: string, aggressive: boolean = false): Promise<string> {
        if (!html) return html;

        try {
            const options = aggressive ? AGGRESSIVE_MINIFY_OPTIONS : DEFAULT_MINIFY_OPTIONS;
            return await htmlMinify(html, options);
        } catch (error) {
            console.warn('HTML minification failed', error);
            return html;
        }
    }

    /**
     * Creates a complete FHIR Narrative object asynchronously
     * @param content - HTML content
     * @param minify - Whether to minify the HTML content (default: true)
     * @returns Promise that resolves to a FHIR Narrative object
     */
    static async createNarrativeAsync(content: string, minify: boolean = true): Promise<Narrative> {
        // Strip outer <div> wrappers if present
        const divMatch = content.match(/^<div[^>]*>(.*?)<\/div>$/);
        if (divMatch) {
            content = divMatch[1]; // Extract inner content
        }

        // Apply minification if requested
        if (minify) {
            content = await this.minifyHtmlAsync(content);
        }

        return {
            status: 'generated',
            div: `<div xmlns="http://www.w3.org/1999/xhtml">${content}</div>`
        };
    }

    /**
     * Generates a complete FHIR Narrative object for a section asynchronously
     * @param section - IPS section type
     * @param resources - Array of domain resources
     * @param timezone - Optional timezone to use for date formatting
     * @param minify - Whether to minify the HTML content (default: true)
     * @returns Promise that resolves to a FHIR Narrative object or undefined if no resources
     */
    static async generateNarrativeAsync<T extends TDomainResource>(
        section: IPSSections,
        resources: T[],
        timezone: string | undefined,
        minify: boolean = true,
    ): Promise<Narrative | undefined> {
        const content = await this.generateNarrativeContentAsync(section, resources, timezone);
        if (!content) {
            return undefined;
        }
        return await this.createNarrativeAsync(content, minify);
    }
}
