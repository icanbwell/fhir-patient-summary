import fs from 'fs';
import path from 'path';

import {html as beautify} from 'js-beautify';
import {TBundle} from "../../src/types/resources/Bundle";
import {TCompositionSection} from "../../src/types/partials/CompositionSection";
import {TBundleEntry} from "../../src/types/partials/BundleEntry";

/**
 * Beautifies HTML using js-beautify
 * @param html - The input HTML string to be formatted
 * @returns Beautifully formatted HTML string
 */
async function beautifyHtml(html: string): Promise<string> {
    try {
        return beautify(html, {
            preserve_newlines: true
        });
    } catch (error) {
        console.error('Formatting Error:', error);
        return html;
    }
}

function readNarrativeFile(folder: string, codeValue: string, sectionTitle: string): string | null {
    // Convert the section title to a filename-friendly format
    const safeSectionTitle = sectionTitle.replace(/[^a-zA-Z0-9]/g, '_').replace(/_{2,}/g, '_');
    const filename = `${codeValue}_${safeSectionTitle}.html`;
    const filePath = path.join(folder, filename);

    try {
        return fs.readFileSync(filePath, 'utf-8');
    } catch (error) {
        console.warn(`Narrative file not found: ${filePath}: ${error}`);
        return null;
    }
}

export async function compare_bundles(folder: string, bundle: TBundle, expectedBundle: TBundle) {
    // remove the date from the bundle for comparison
    bundle.timestamp = expectedBundle.timestamp;
    if (bundle.entry && bundle.entry[0].resource?.date) {
        bundle.entry[0].resource.date = expectedBundle.entry?.[0].resource?.date;
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

            if (!generatedDiv || !expectedDiv) {
                console.warn(`Section ${i + 1} is missing div content.`);
                continue; // Skip comparison if div is missing
            }

            // now clear out the div for comparison
            if (generatedDiv && expectedDiv) {
                const generatedFormattedHtml = await beautifyHtml(generatedDiv);
                const expectedFormattedHtml = await beautifyHtml(expectedDiv);
                if (generatedFormattedHtml === expectedFormattedHtml) {
                    console.info(`Section ${i + 1} matches for ${generatedSection.title}`);
                } else {
                    console.info(`${generatedSection.title}\nGenerated:\n${generatedFormattedHtml}\nExpected:\n${expectedFormattedHtml}`);
                }
                expect(generatedFormattedHtml).toStrictEqual(expectedFormattedHtml);
            }
        }
    }
    // expect(bundle).toEqual(expectedBundle);
}
