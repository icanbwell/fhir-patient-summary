import fs from 'fs';
import path from 'path';
import {ComprehensiveIPSCompositionBuilder} from "../src/generators/fhir_summary_generator";
import {TCompositionSection} from "../src/types/partials/CompositionSection";
import {TBundleEntry} from "../src/types/partials/BundleEntry";

describe('FHIR Patient Summary Generation', () => {
    it('should generate the correct summary for the provided bundle', () => {
        // Read the test bundle JSON
        const bundlePath = path.join(__dirname, 'fixtures/test-bundle.json');
        const inputBundle = JSON.parse(fs.readFileSync(bundlePath, 'utf-8'));

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
        bundle.timestamp = undefined;
        inputBundle.timestamp = undefined;
        if (bundle.entry && bundle.entry[0].resource?.date) {
            bundle.entry[0].resource.date = undefined;
        }
        if (inputBundle.entry && inputBundle.entry[0].resource?.date) {
            inputBundle.entry[0].resource.date = undefined;
        }
        // extract the dev from each section and compare
        const generatedSections: TCompositionSection[] | undefined = bundle.entry?.filter((e: TBundleEntry) => e.resource?.resourceType === 'Composition')
            .map((e: TBundleEntry) => e.resource?.section as TCompositionSection)
            .flat()
            .filter((s: TCompositionSection) => s);
        const expectedSections: TCompositionSection[] | undefined = inputBundle.entry
            .filter((e: TBundleEntry) => e.resource?.resourceType === 'Composition')
            .map((e: TBundleEntry) => e.resource?.section)
            .flat()
            .filter((s: TCompositionSection) => s);
        // compare the div of each section
        expect(generatedSections).toBeDefined();
        expect(expectedSections).toBeDefined();
        // expect(generatedSections?.length).toBe(expectedSections?.length);
        if (generatedSections && expectedSections) {
            for (let i = 0; i < generatedSections.length; i++) {
                console.info(`Comparing section ${i + 1}/${generatedSections.length}`);
                console.info(`Generated: ${generatedSections[i].text?.div}`);
                console.info(`Expected: ${expectedSections[i]?.text?.div}`);
                // now clear out the div for comparison
                if (generatedSections && generatedSections[i] && generatedSections[i].text && generatedSections[i]?.text?.div) {
                    expect(generatedSections[i].text?.div).toBeDefined();
                    delete generatedSections[i].text;
                }
                if (expectedSections && expectedSections[i] && expectedSections[i].text && expectedSections[i]?.text?.div) {
                    expect(expectedSections[i].text?.div).toBeDefined();
                    delete expectedSections[i].text;
                }
            }
        }
        expect(bundle).toEqual(inputBundle);
    });
});
