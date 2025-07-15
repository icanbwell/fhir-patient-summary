import fs from 'fs';
import path from 'path';

import {html as beautify} from 'js-beautify';
import {TBundle} from "../../src/types/resources/Bundle";
import {TBundleEntry} from "../../src/types/partials/BundleEntry";
import {TComposition} from "../../src/types/resources/Composition";
import {TCompositionSection} from "../../src/types/partials/CompositionSection";

/**
 * Beautifies HTML using js-beautify
 * @param html - The input HTML string to be formatted
 * @returns Beautifully formatted HTML string
 */
async function beautifyHtml(html: string): Promise<string> {
    try {
        // Preprocess HTML to fix specific cases
        // Join empty <ul></ul> elements with their preceding text within table cells
        const preprocessedHtml = html
            .replace(/(<td>[^<]+?)[\s\r\n]+([ \t]*)<ul><\/ul>/g, '$1<ul></ul>')
            .replace(/(<td>[^<]+?)<ul><\/ul>[\s\r\n]+([ \t]*)<\/td>/g, '$1<ul></ul></td>');

        // Add configuration to prevent line breaks between text and adjacent elements
        return beautify(preprocessedHtml, {
            indent_size: 4,
            wrap_line_length: 100,
            preserve_newlines: true,
            max_preserve_newlines: 1,
            unformatted: ['ul', 'li', 'span', 'a'], // Keep these tags inline
            inline: ['span', 'a', 'ul'], // Treat these tags as inline elements
            content_unformatted: ['pre', 'textarea', 'td'], // Preserve content formatting in these tags
            indent_inner_html: true,
            extra_liners: ['body', 'html', 'head', 'table', 'tbody', 'thead', 'tr']
        });
    } catch (error) {
        console.error('Formatting Error:', error);
        return html;
    }
}

/**
 * Reads a narrative file based on the provided folder, code value, and section title.
 * @param folder - The folder where narrative files are stored
 * @param codeValue - The LOINC code value to identify the narrative file
 * @param sectionTitle - The title of the section to create a filename-friendly format
 */
export function readNarrativeFile(folder: string, codeValue: string, sectionTitle: string): string | undefined {
    // Convert the section title to a filename-friendly format
    const safeSectionTitle = sectionTitle.replace(/[^a-zA-Z0-9]/g, '_').replace(/_{2,}/g, '_');
    const filename = `${codeValue}_${safeSectionTitle}.html`;
    const filePath = path.join(folder, filename);

    try {
        return fs.readFileSync(filePath, 'utf-8');
    } catch (error) {
        throw new Error(`Narrative file not found: ${filePath}: ${error}`);
    }
}

/**
 * Compares generated HTML narratives with expected narratives.
 * @param generatedHtml - The generated HTML narrative string
 * @param expectedHtml - The expected HTML narrative string
 */
export async function compareNarratives(generatedHtml: string | undefined, expectedHtml: string | undefined) {
    if (!generatedHtml || !expectedHtml) {
        throw new Error('Both generated and expected HTML narratives must be provided for comparison.');
    }
    // Beautify both HTML strings for comparison
    const generatedFormattedHtml = await beautifyHtml(generatedHtml);
    const expectedFormattedHtml = await beautifyHtml(expectedHtml);

    // Compare the formatted HTML strings
    if (generatedFormattedHtml === expectedFormattedHtml) {
        console.info('Narrative matches expected output.');
    } else {
        console.info('Narrative does not match expected output.');
        console.info(`Generated:\n${generatedFormattedHtml}`);
        console.info(`Expected:\n${expectedFormattedHtml}`);
    }

    expect(generatedFormattedHtml).toStrictEqual(expectedFormattedHtml);
}

/**
 * Compares two FHIR bundles by checking their sections and narratives.
 * @param folder - The folder where narrative files are stored
 * @param bundle - The generated FHIR bundle to compare
 * @param expectedBundle - The expected FHIR bundle to compare against
 */
export async function compare_bundles(folder: string, bundle: TBundle, expectedBundle: TBundle) {
    // remove the date from the bundle for comparison
    bundle.timestamp = expectedBundle.timestamp;
    if (bundle.entry && bundle.entry[0].resource?.date) {
        bundle.entry[0].resource.date = expectedBundle.entry?.[0].resource?.date;
    }

    // Compare the text.div of the first Composition resource if available
    const generatedComposition: TComposition = <TComposition>bundle.entry?.find((e: TBundleEntry) => e.resource?.resourceType === 'Composition')?.resource;

    const expectedCompositionDiv = readNarrativeFile(folder, '', 'Composition');

    expect(expectedCompositionDiv?.length).toBeGreaterThan(0);
    if (generatedComposition?.text?.div && expectedCompositionDiv) {
        console.info('======= Comparing Composition narrative ======');
        await compareNarratives(
            generatedComposition.text.div,
            expectedCompositionDiv
        );
    }

    // extract the div from each section and compare
    const generatedSections: TCompositionSection[] | undefined = bundle.entry?.filter((e: TBundleEntry) => e.resource?.resourceType === 'Composition')
        .map((e: TBundleEntry) => e.resource?.section as TCompositionSection)
        .flat()
        .filter((s: TCompositionSection) => s);
    const expectedSections: TCompositionSection[] | undefined = expectedBundle.entry?.filter((e: TBundleEntry) => e.resource?.resourceType === 'Composition')
        .map((e: TBundleEntry) => e.resource?.section as TCompositionSection)
        .flat()
        .filter((s: TCompositionSection) => s);
    // compare the div of each section
    expect(generatedSections).toBeDefined();
    expect(expectedSections).toBeDefined();
    // const turndownService = new TurndownService();
    // expect(generatedSections?.length).toBe(expectedSections?.length);
    if (generatedSections && expectedSections) {
        for (let i = 0; i < generatedSections.length; i++) {
            const generatedSection = generatedSections[i];
            console.info(`======= Comparing section ${generatedSection.title} ${i + 1}/${generatedSections.length} ====`);
            const generatedDiv: string | undefined = generatedSection.text?.div;

            // Get LOINC code for the section
            const codeValue = generatedSection.code?.coding?.[0].code;
            if (!codeValue) {
                expect(codeValue).toBeDefined();
            }

            // Read narrative from file
            const expectedDiv = readNarrativeFile(folder, codeValue as string, generatedSection.title || '');

            expect(expectedDiv?.length).toBeGreaterThan(0);

            console.info(`Using narrative from file for ${generatedSection.title}`);

            await compareNarratives(
                generatedDiv || '',
                expectedDiv || ''
            )
        }
    }
    // expect(bundle).toEqual(expectedBundle);
}
