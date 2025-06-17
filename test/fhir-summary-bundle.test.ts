import fs from 'fs';
import path from 'path';
import {ComprehensiveIPSCompositionBuilder} from "../src/generators/fhir_summary_generator";
import {TCompositionSection} from "../src/types/partials/CompositionSection";
import {TBundleEntry} from "../src/types/partials/BundleEntry";
import TurndownService from 'turndown';

describe('FHIR Patient Summary Generation', () => {
    it('should generate the correct summary for the Aidbox bundle', () => {
        // Read the test bundle JSON
        const inputBundle = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures/test-bundle.json'), 'utf-8'));
        const expectedBundle = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures/expected-bundle.json'), 'utf-8'));

        // Extract resources from the bundle
        const resources = inputBundle.entry.map((e: any) => e.resource);

        // extract the patient resource
        const mockPatient = resources.find((r: any) => r.resourceType === 'Patient');

        // Generate the summary
        const builder = new ComprehensiveIPSCompositionBuilder(mockPatient);
        builder.read_bundle(inputBundle);

        const bundle = builder.build_bundle(
            'example-organization',
            'Example Organization',
            'https://fhir.icanbwell.com/4_0_0/'
        );
        console.info('---- Bundle ----');
        console.info(JSON.stringify(bundle, (key, value) => {
            if (value === undefined) {
                return undefined; // This will omit undefined properties
            }
            return value;
        }));
        console.info('-----------------');

        // Compare the generated summary to the expected output in the bundle
        // (Assume the expected output is the Composition resource in the bundle)
        expect(bundle.entry).toBeDefined();
        // remove the date from the bundle for comparison
        bundle.timestamp = expectedBundle.timestamp;
        if (bundle.entry && bundle.entry[0].resource?.date) {
            bundle.entry[0].resource.date = expectedBundle.entry[0].resource.date;
        }

        // extract the div from each section and compare
        const generatedSections: TCompositionSection[] | undefined = bundle.entry?.filter((e: TBundleEntry) => e.resource?.resourceType === 'Composition')
            .map((e: TBundleEntry) => e.resource?.section as TCompositionSection)
            .flat()
            .filter((s: TCompositionSection) => s);
        const expectedSections: TCompositionSection[] | undefined = expectedBundle.entry
            .filter((e: TBundleEntry) => e.resource?.resourceType === 'Composition')
            .map((e: TBundleEntry) => e.resource?.section)
            .flat()
            .filter((s: TCompositionSection) => s);
        // compare the div of each section
        expect(generatedSections).toBeDefined();
        expect(expectedSections).toBeDefined();
        const turndownService = new TurndownService();
        // expect(generatedSections?.length).toBe(expectedSections?.length);
        if (generatedSections && expectedSections) {
            for (let i = 0; i < generatedSections.length; i++) {
                console.info(`Comparing section ${i + 1}/${generatedSections.length}`);
                const generatedDiv: string | undefined = generatedSections[i].text?.div;
                console.info(`Generated: ${generatedDiv}`);
                const expectedDiv: string | undefined = expectedSections[i]?.text?.div;
                console.info(`Expected: ${expectedDiv}`);
                if (!generatedDiv || !expectedDiv) {
                    console.warn(`Section ${i + 1} is missing div content.`);
                    continue; // Skip comparison if div is missing
                }
                // now clear out the div for comparison
                if (generatedDiv && expectedDiv) {
                    const generatedMarkdown = turndownService.turndown(generatedDiv);
                    const expectedMarkdown = turndownService.turndown(expectedDiv);
                    if (generatedMarkdown != expectedMarkdown) {
                        console.warn('Markdown mismatch detected:');
                        console.warn(`------ Generated Markdown ----\n${generatedMarkdown}`);
                        console.warn(`------ Expected Markdown -----\n${expectedMarkdown}`);
                    }
                    expect(generatedMarkdown).toStrictEqual(expectedMarkdown);
                }
            }
        }
        expect(bundle).toEqual(expectedBundle);
    });
    it('should generate the correct summary for the Epic bundle', () => {
        // Read the test bundle JSON
        const inputBundle = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures/test-epic-bundle.json'), 'utf-8'));
        const expectedBundle = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures/expected-epic-bundle.json'), 'utf-8'));

        // Extract resources from the bundle
        const resources = inputBundle.entry.map((e: any) => e.resource);

        // extract the patient resource
        const mockPatient = resources.find((r: any) => r.resourceType === 'Patient');

        // Generate the summary
        const builder = new ComprehensiveIPSCompositionBuilder(mockPatient);
        builder.read_bundle(inputBundle);

        const bundle = builder.build_bundle(
            'example-organization',
            'Example Organization',
            'https://fhir.icanbwell.com/4_0_0/'
        );
        console.info('---- Bundle ----');
        console.info(JSON.stringify(bundle, (key, value) => {
            if (value === undefined) {
                return undefined; // This will omit undefined properties
            }
            return value;
        }));
        console.info('-----------------');

        // Compare the generated summary to the expected output in the bundle
        // (Assume the expected output is the Composition resource in the bundle)
        expect(bundle.entry).toBeDefined();
        // remove the date from the bundle for comparison
        bundle.timestamp = expectedBundle.timestamp;
        if (bundle.entry && bundle.entry[0].resource?.date) {
            bundle.entry[0].resource.date = expectedBundle.entry[0].resource.date;
        }

        // extract the div from each section and compare
        const generatedSections: TCompositionSection[] | undefined = bundle.entry?.filter((e: TBundleEntry) => e.resource?.resourceType === 'Composition')
            .map((e: TBundleEntry) => e.resource?.section as TCompositionSection)
            .flat()
            .filter((s: TCompositionSection) => s);
        const expectedSections: TCompositionSection[] | undefined = expectedBundle.entry
            .filter((e: TBundleEntry) => e.resource?.resourceType === 'Composition')
            .map((e: TBundleEntry) => e.resource?.section)
            .flat()
            .filter((s: TCompositionSection) => s);
        // compare the div of each section
        expect(generatedSections).toBeDefined();
        expect(expectedSections).toBeDefined();
        const turndownService = new TurndownService();
        // expect(generatedSections?.length).toBe(expectedSections?.length);
        if (generatedSections && expectedSections) {
            for (let i = 0; i < generatedSections.length; i++) {
                console.info(`Comparing section ${i + 1}/${generatedSections.length}`);
                const generatedDiv: string | undefined = generatedSections[i].text?.div;
                console.info(`Generated: ${generatedDiv}`);
                const expectedDiv: string | undefined = expectedSections[i]?.text?.div;
                console.info(`Expected: ${expectedDiv}`);
                if (!generatedDiv || !expectedDiv) {
                    console.warn(`Section ${i + 1} is missing div content.`);
                    continue; // Skip comparison if div is missing
                }
                // now clear out the div for comparison
                if (generatedDiv && expectedDiv) {
                    const generatedMarkdown = turndownService.turndown(generatedDiv);
                    const expectedMarkdown = turndownService.turndown(expectedDiv);
                    if (generatedMarkdown != expectedMarkdown) {
                        console.warn('Markdown mismatch detected:');
                        console.warn(`------ Generated Markdown ----\n${generatedMarkdown}`);
                        console.warn(`------ Expected Markdown -----\n${expectedMarkdown}`);
                    }
                    expect(generatedMarkdown).toStrictEqual(expectedMarkdown);
                }
            }
        }
        expect(bundle).toEqual(expectedBundle);
    });
});
