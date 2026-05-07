import fs from 'fs';
import path from 'path';
import { ComprehensiveIPSCompositionBuilder } from '../../src';
import { compare_bundles } from '../utilities/testHelpers';

describe('Full Record Bundle Generation', () => {
    beforeEach(() => {
        jest.useFakeTimers({
            doNotFake: [
                'hrtime',
                'nextTick',
                'performance',
                'queueMicrotask',
                'requestAnimationFrame',
                'cancelAnimationFrame',
                'requestIdleCallback',
                'cancelIdleCallback',
                'setImmediate',
                'clearImmediate',
                'setInterval',
                'clearInterval',
                'setTimeout',
                'clearTimeout'
            ]
        });
        jest.setSystemTime(new Date('2025-12-23T12:00:00Z'));
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    it('should generate the correct summary for the concatenated full record bundle', async () => {
        process.env.SUMMARY_IPS_COMPOSITION_SECTIONS = 'all';
        process.env.SUMMARY_COMPOSITION_SECTIONS = 'all';

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
        // If you have an expected bundle, replace inputBundle below
        await compare_bundles(path.join(__dirname, 'fixtures/expected/narratives'), bundle, inputBundle);

        process.env.SUMMARY_IPS_COMPOSITION_SECTIONS = '';
        process.env.SUMMARY_COMPOSITION_SECTIONS = '';
    });
});

