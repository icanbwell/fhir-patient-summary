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
 * A `<` only starts markup when followed by a tag name, `/`, `!` (comment or
 * doctype) or `?` (processing instruction). Anything else is literal text.
 *
 * Clinical free text routinely carries comparator values the templates
 * interpolate without escaping — "<10", "<= 5 mg/dL", "< 60 mL/min". Left
 * raw, the minifier's parser reads them as a malformed tag and rejects the
 * whole narrative.
 */
const STRAY_LESS_THAN = /<(?![a-zA-Z/!?])/g;

/**
 * Generates narrative content for FHIR resources using TypeScript templates
 * Replaces the Nunjucks-based narrative generator
 */
export class NarrativeGenerator {
    /**
     * Escapes `<` characters that cannot be the start of a tag, leaving real
     * markup untouched. Idempotent, so it is safe to apply more than once and
     * on content the templates already escaped via `renderTextAsHtml`.
     * @param html - HTML content that may contain unescaped clinical text
     * @returns The same HTML with stray `<` replaced by `&lt;`
     */
    static escapeStrayAngleBrackets(html: string): string {
        if (!html) return html;
        return html.replace(STRAY_LESS_THAN, '&lt;');
    }

    /**
     * Generates narrative HTML content for a section
     * @param section - IPS section type
     * @param resources - Array of domain resources
     * @param timezone - Optional timezone to use for date formatting (e.g., 'America/New_York', 'Europe/London')
     * @param useSectionSummary - Whether to use section summary for narrative generation (default: false)
     * @param now - Optional date parameter
     * @param summaryUnderlyingResources - Optional resolved resources referenced by a summary Composition's section entries (see ISummaryTemplate.generateSummaryNarrative), passed through to templates that need per-reading data
     * @returns Generated HTML content or undefined if no resources
     */
    static async generateNarrativeContentAsync<T extends TDomainResource>(
        section: IPSSections,
        resources: T[],
        timezone: string | undefined,
        useSectionSummary: boolean = false,
        now?: Date,
        summaryUnderlyingResources?: TDomainResource[]
    ): Promise<string | undefined> {
        if (!resources || resources.length === 0) {
            return undefined; // No resources to generate narrative
        }

        try {
            // Use the TypeScript template mapper to generate HTML
            const content = TypeScriptTemplateMapper.generateNarrative(section, resources, timezone, useSectionSummary, now, summaryUnderlyingResources);
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

        const normalized = this.escapeStrayAngleBrackets(html);

        try {
            const options = aggressive ? AGGRESSIVE_MINIFY_OPTIONS : DEFAULT_MINIFY_OPTIONS;
            return await htmlMinify(normalized, options);
        } catch (error) {
            // Log no content. The narrative may hold sensitive clinical data,
            // and html-minifier-terser echoes a fragment of its input in the
            // error message, so neither is safe to write out.
            console.warn(
                `HTML minification failed (${error instanceof Error ? error.name : typeof error}); ` +
                `returning unminified content of ${normalized.length} chars`
            );
            // Minification is an optimization. Returning the error message here
            // would replace the narrative with it and copy the echoed fragment
            // into the Composition.
            return normalized;
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

        // Escape unconditionally — the narrative has to be well-formed XHTML
        // for consumers whether or not it gets minified.
        content = this.escapeStrayAngleBrackets(content);

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
     * @param useSectionSummary - Whether to use section summary for narrative generation (default: false)
     * @param now - Optional date parameter
     * @param summaryUnderlyingResources - Optional resolved resources referenced by a summary Composition's section entries (see ISummaryTemplate.generateSummaryNarrative), passed through to templates that need per-reading data
     * @returns Promise that resolves to a FHIR Narrative object or undefined if no resources
     */
    static async generateNarrativeAsync<T extends TDomainResource>(
        section: IPSSections,
        resources: T[],
        timezone: string | undefined,
        minify: boolean = true,
        useSectionSummary: boolean = false,
        now?: Date,
        summaryUnderlyingResources?: TDomainResource[]
    ): Promise<Narrative | undefined> {
        const content = await this.generateNarrativeContentAsync(section, resources, timezone, useSectionSummary, now, summaryUnderlyingResources);
        if (!content) {
            return undefined;
        }
        return await this.createNarrativeAsync(content, minify);
    }
}
