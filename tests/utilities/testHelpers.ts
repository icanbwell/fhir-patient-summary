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
            preserve_newlines: false,
        });
    } catch (error) {
        console.error('Formatting Error:', error);
        return html;
    }
}

function getFileNameForSection(sectionTitle: string, codeValue: string, folder: string) {
    const safeSectionTitle = sectionTitle.replace(/[^a-zA-Z0-9]/g, '_').replace(/_{2,}/g, '_');
    const filename = `${codeValue}_${safeSectionTitle}.html`;
    return path.join(folder, filename);
}

/**
 * Reads a narrative file based on the provided folder, code value, and section title.
 * @param folder - The folder where narrative files are stored
 * @param codeValue - The LOINC code value to identify the narrative file
 * @param sectionTitle - The title of the section to create a filename-friendly format
 */
export function readNarrativeFile(folder: string, codeValue: string, sectionTitle: string): string | undefined {
    // Convert the section title to a filename-friendly format
    const filePath = getFileNameForSection(sectionTitle, codeValue, folder);

    try {
        return fs.readFileSync(filePath, 'utf-8');
    } catch (error) {
        throw new Error(`Narrative file not found: ${filePath}: ${error}`);
    }
}

/**
 * Reads a narrative file if it exists, otherwise returns undefined.
 * @param folder - The folder where narrative files are stored
 * @param codeValue - The LOINC code value to identify the narrative file
 * @param sectionTitle - The title of the section to create a filename-friendly format
 */
export function readNarrativeFileIfExists(folder: string, codeValue: string, sectionTitle: string): string | undefined {
    const filePath = getFileNameForSection(sectionTitle, codeValue, folder);
    if (fs.existsSync(filePath)) {
        return fs.readFileSync(filePath, 'utf-8');
    }
    return undefined;
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
        console.info(`Generated (beautified):\n${generatedFormattedHtml}`);
        console.info(`Expected (beautified):\n${expectedFormattedHtml}`);
    }

    expect(generatedFormattedHtml).toStrictEqual(expectedFormattedHtml);
}

/**
 * Compares two FHIR bundles by checking their sections and narratives.
 * If a narrative file does not exist, it is written for future use.
 */
export async function compare_bundles(folder: string, bundle: TBundle, expectedBundle: TBundle) {
    // remove the date from the bundle for comparison
    bundle.timestamp = expectedBundle.timestamp;
    if (bundle.entry && bundle.entry[0].resource?.date) {
        bundle.entry[0].resource.date = expectedBundle.entry?.[0].resource?.date;
    }

    if (!fs.existsSync(folder)) {
        fs.mkdirSync(folder, { recursive: true });
    }

    // Handle Composition narrative
    const generatedComposition: TComposition = <TComposition>bundle.entry?.find((e: TBundleEntry) => e.resource?.resourceType === 'Composition')?.resource;
    const compFile = getFileNameForSection('Composition', '', folder);
    const expectedCompositionDiv = readNarrativeFileIfExists(folder, '', 'Composition');

    if (generatedComposition?.text?.div) {
        if (expectedCompositionDiv === undefined) {
            fs.writeFileSync(compFile, generatedComposition.text.div, 'utf-8');
            console.info(`Wrote generated Composition narrative to ${compFile}`);
        } else {
            console.info('======= Comparing Composition narrative ======');
            await compareNarratives(
                generatedComposition.text.div,
                expectedCompositionDiv
            );
        }
    }

    // Handle section narratives
    const generatedSections: TCompositionSection[] | undefined = bundle.entry?.filter((e: TBundleEntry) => e.resource?.resourceType === 'Composition')
        .map((e: TBundleEntry) => e.resource?.section as TCompositionSection)
        .flat()
        .filter((s: TCompositionSection) => s);
    const expectedSections: TCompositionSection[] | undefined = expectedBundle.entry?.filter((e: TBundleEntry) => e.resource?.resourceType === 'Composition')
        .map((e: TBundleEntry) => e.resource?.section as TCompositionSection)
        .flat()
        .filter((s: TCompositionSection) => s);
    expect(generatedSections).toBeDefined();
    expect(expectedSections).toBeDefined();
    if (generatedSections && expectedSections) {
        for (let i = 0; i < generatedSections.length; i++) {
            const generatedSection = generatedSections[i];
            console.info(`======= Checking section ${generatedSection.title} ${i + 1}/${generatedSections.length} ====\n`);
            const generatedDiv: string | undefined = generatedSection.text?.div;
            const codeValue = generatedSection.code?.coding?.[0].code;
            if (!codeValue) {
                expect(codeValue).toBeDefined();
            }
            const secFile = getFileNameForSection(generatedSection.title || '', codeValue as string, folder);
            const expectedDiv = readNarrativeFileIfExists(folder, codeValue as string, generatedSection.title || '');
            if (generatedDiv) {
                if (expectedDiv === undefined) {
                    fs.writeFileSync(secFile, generatedDiv, 'utf-8');
                    console.info(`Wrote generated section narrative to ${secFile}`);
                } else {
                    console.info(`Comparing narrative for section: ${generatedSection.title}`);
                    await compareNarratives(
                        generatedDiv || '',
                        expectedDiv || ''
                    );
                }
            }
        }
    }
}
