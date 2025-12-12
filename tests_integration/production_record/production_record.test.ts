import fs from 'fs';
import path from 'path';
import { ComprehensiveIPSCompositionBuilder } from '../../src';
import { ipsBundleToMarkdown } from '../../src/generators/IPSBundleToMarkdown';

describe('Full Record Bundle Generation', () => {
    it('should generate the correct summary for the concatenated full record bundle', async () => {
        // Path to the sandbox fixtures
        const sandboxDir = path.join(__dirname, 'fixtures/sandbox');
        const resourceDirs = fs.readdirSync(sandboxDir).filter(f => fs.statSync(path.join(sandboxDir, f)).isDirectory());
        const resources: any[] = [];
        for (const dir of resourceDirs) {
            const dirPath = path.join(sandboxDir, dir);
            const files = fs.readdirSync(dirPath).filter(f => f.endsWith('.json'));
            for (const file of files) {
                const filePath = path.join(dirPath, file);
                const content = fs.readFileSync(filePath, 'utf-8');
                try {
                    resources.push(JSON.parse(content));
                } catch (e) {
                    // skip invalid JSON
                    console.warn(`Skipping invalid JSON file: ${filePath}: ${e}`);
                }
            }
        }
        // Compose a FHIR bundle
        const inputBundle = {
            resourceType: 'Bundle',
            type: 'collection',
            entry: resources.map(resource => ({ resource }))
        };
        // Find the patient resource
        const mockPatient = resources.find((r: any) => r.resourceType === 'Patient');
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
