import { ipsBundleToMarkdown } from '../../src/generators/IPSBundleToMarkdown';

describe('ipsBundleToMarkdown', () => {
    it('throws error if input is not a Bundle', () => {
        expect(() => ipsBundleToMarkdown({} as any)).toThrow('Input is not a valid FHIR Bundle');
        expect(() => ipsBundleToMarkdown(null as any)).toThrow('Input is not a valid FHIR Bundle');
    });

    it('returns message if no Composition resource found', () => {
        const bundle = {
            resourceType: 'Bundle',
            entry: [
                { resource: { resourceType: 'Patient', id: 'p1' } }
            ]
        };
        expect(ipsBundleToMarkdown(bundle as any)).toMatch(/^# No Composition resource found/);
    });

    it('renders title and narrative from Composition', () => {
        const bundle = {
            resourceType: 'Bundle',
            entry: [
                {
                    resource: {
                        resourceType: 'Composition',
                        title: 'Test Summary',
                        text: { div: '<div>Some <b>narrative</b> text.</div>' }
                    }
                }
            ]
        };
        const md = ipsBundleToMarkdown(bundle as any);
        expect(md).toContain('# Test Summary');
        expect(md).toContain('Some narrative text.');
    });

    it('renders default title if Composition.title is missing', () => {
        const bundle = {
            resourceType: 'Bundle',
            entry: [
                {
                    resource: {
                        resourceType: 'Composition',
                        text: { div: '<div>Summary narrative</div>' }
                    }
                }
            ]
        };
        const md = ipsBundleToMarkdown(bundle as any);
        expect(md).toContain('# Patient Summary');
        expect(md).toContain('Summary narrative');
    });

    it('renders sections with titles and text', () => {
        const bundle = {
            resourceType: 'Bundle',
            entry: [
                {
                    resource: {
                        resourceType: 'Composition',
                        title: 'With Sections',
                        section: [
                            {
                                title: 'Allergies',
                                text: { div: '<div>Peanut allergy</div>' }
                            },
                            {
                                text: { div: '<div>No known conditions</div>' }
                            }
                        ]
                    }
                }
            ]
        };
        const md = ipsBundleToMarkdown(bundle as any);
        expect(md).toContain('## Allergies');
        expect(md).toContain('Peanut allergy');
        expect(md).toContain('## Section 2');
        expect(md).toContain('No known conditions');
    });

    it('lists resources by type and includes Patient names', () => {
        const bundle = {
            resourceType: 'Bundle',
            entry: [
                {
                    resource: {
                        resourceType: 'Composition',
                        title: 'Summary'
                    }
                },
                {
                    resource: {
                        resourceType: 'Patient',
                        id: 'pat1',
                        name: [
                            { given: ['John'], family: 'Doe' }
                        ]
                    }
                },
                {
                    resource: {
                        resourceType: 'Observation',
                        id: 'obs1'
                    }
                },
                {
                    resource: {
                        resourceType: 'Patient',
                        id: 'pat2',
                        name: [
                            { given: ['Jane'], family: 'Smith' }
                        ]
                    }
                }
            ]
        };
        const md = ipsBundleToMarkdown(bundle as any);
        expect(md).toContain('### Patient (2)');
        expect(md).toContain('**pat1** - John Doe');
        expect(md).toContain('**pat2** - Jane Smith');
        expect(md).toContain('### Observation (1)');
        expect(md).toContain('**obs1**');
    });

    it('handles missing Patient name gracefully', () => {
        const bundle = {
            resourceType: 'Bundle',
            entry: [
                { resource: { resourceType: 'Composition', title: 'Summary' } },
                { resource: { resourceType: 'Patient', id: 'pat1' } }
            ]
        };
        const md = ipsBundleToMarkdown(bundle as any);
        expect(md).toContain('**pat1**');
    });

    it('handles empty or missing entries', () => {
        const bundle1 = { resourceType: 'Bundle' };
        const bundle2 = { resourceType: 'Bundle', entry: [] };
        expect(ipsBundleToMarkdown(bundle1 as any)).toMatch(/^# No Composition resource found/);
        expect(ipsBundleToMarkdown(bundle2 as any)).toMatch(/^# No Composition resource found/);
    });
});

