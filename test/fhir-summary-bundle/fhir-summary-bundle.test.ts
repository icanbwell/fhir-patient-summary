import fs from 'fs';
import path from 'path';
import {ComprehensiveIPSCompositionBuilder} from "../../src";
import {compare_bundles} from "../utilities/testHelpers";

describe('FHIR Patient Summary Generation', () => {
    it('should generate the correct summary for the Aidbox bundle', async () => {
        // Read the test bundle JSON
        const inputBundle = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures/test-bundle.json'), 'utf-8'));
        const expectedBundle = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures/expected-bundle.json'), 'utf-8'));

        // Extract resources from the bundle
        const resources = inputBundle.entry.map((e: any) => e.resource);

        // extract the patient resource
        const mockPatient = resources.find((r: any) => r.resourceType === 'Patient');

        // Generate the summary
        const builder = new ComprehensiveIPSCompositionBuilder().setPatient(mockPatient);
        const timezone = 'America/New_York';
        await builder.readBundleAsync(inputBundle, timezone);

        const bundle = await builder.buildBundleAsync(
            'example-organization',
            'Example Organization',
            'https://fhir.icanbwell.com/4_0_0/',
            timezone
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
        await compare_bundles(path.join(__dirname, 'fixtures/narratives/aidbox'), bundle, expectedBundle);
    });
    it('should generate the correct summary for the Epic bundle', async () => {
        // Read the test bundle JSON
        const inputBundle = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures/test-epic-bundle.json'), 'utf-8'));
        const expectedBundle = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures/expected-epic-bundle.json'), 'utf-8'));

        // Extract resources from the bundle
        const resources = inputBundle.entry.map((e: any) => e.resource);

        // extract the patient resource
        const mockPatient = resources.find((r: any) => r.resourceType === 'Patient');

        // Generate the summary
        const builder = new ComprehensiveIPSCompositionBuilder().setPatient(mockPatient);
        const timezone = 'America/New_York';
        await builder.readBundleAsync(inputBundle, timezone);

        const bundle = await builder.buildBundleAsync(
            'example-organization',
            'Example Organization',
            'https://fhir.icanbwell.com/4_0_0/',
            timezone
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
        await compare_bundles(path.join(__dirname, 'fixtures/narratives/epic'), bundle, expectedBundle);
    });
});
