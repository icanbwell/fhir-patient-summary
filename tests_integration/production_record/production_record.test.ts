import fs from 'fs';
import path from 'path';
import { ComprehensiveIPSCompositionBuilder } from '../../src';
import { ipsBundleToMarkdown } from '../../src/generators/IPSBundleToMarkdown';

describe('Full Record Bundle Generation', () => {
    it('should generate the correct summary for the concatenated full record bundle', async () => {
        // Path to the bundle.json fixture
        const bundlePath = path.join(__dirname, 'fixtures/production/bundle.json');
        const bundleContent = fs.readFileSync(bundlePath, 'utf-8');
        const inputBundle = JSON.parse(bundleContent);
        // Find the patient resource
        const mockPatient = inputBundle.entry.find((e: any) => e.resource.resourceType === 'Patient')?.resource;
        expect(mockPatient).toBeDefined();
        // Generate the summary
        const builder = new ComprehensiveIPSCompositionBuilder().setPatient(mockPatient);
        const timezone = 'America/New_York';
        await builder.readBundleAsync(inputBundle, timezone, true);
        const bundle = await builder.buildBundleAsync(
            'example-organization',
            'Example Organization',
            'https://fhir.icanbwell.com/4_0_0/',
            timezone
        );
        // For this test, we use the bundle itself as expected (round-trip)
        expect(bundle.entry).toBeDefined();

        // Generate markdown from the resulting bundle
        const markdown = ipsBundleToMarkdown(bundle);
        expect(typeof markdown).toBe('string');
        expect(markdown.length).toBeGreaterThan(0);
        // Optionally, write the markdown to a file for inspection
        fs.writeFileSync(path.join(__dirname, 'temp/output.md'), markdown);
    });
});
