import { ipsBundleToMarkdown } from '../../src/generators/IPSBundleToMarkdown';
import {TBundle} from "../../src/types/resources/Bundle";
import {TPatient} from "../../src/types/resources/Patient";
import {TComposition} from "../../src/types/resources/Composition";
import {TObservation} from "../../src/types/resources/Observation";

describe('ipsBundleToMarkdown', () => {
    it('throws error if input is not a Bundle', () => {
        expect(() => ipsBundleToMarkdown({} as any)).toThrow('Input is not a valid FHIR Bundle');
        expect(() => ipsBundleToMarkdown(null as any)).toThrow('Input is not a valid FHIR Bundle');
    });

    it('returns message if no Composition resource found', () => {
        const bundle: TBundle = {
            resourceType: 'Bundle',
            type: 'collection',
            entry: [
                { resource: { resourceType: 'Patient', id: 'p1' } as TPatient }
            ]
        };
        expect(ipsBundleToMarkdown(bundle)).toMatch(/^# No Composition resource found/);
    });

    it('renders title and narrative from Composition', () => {
        const bundle: TBundle = {
            resourceType: 'Bundle',
            type: 'collection',
            entry: [
                {
                    resource: {
                        resourceType: 'Composition',
                        title: 'Test Summary',
                        text: { div: '<div>Some <b>narrative</b> text.</div>' }
                    } as TComposition
                }
            ]
        };
        const md = ipsBundleToMarkdown(bundle);
        expect(md).toContain('# Test Summary');
        expect(md).toContain('Some **narrative** text.');
    });

    it('renders default title if Composition.title is missing', () => {
        const bundle: TBundle = {
            resourceType: 'Bundle',
            type: 'collection',
            entry: [
                {
                    resource: {
                        resourceType: 'Composition',
                        text: { div: '<div>Summary narrative</div>' }
                    } as TComposition
                }
            ]
        };
        const md = ipsBundleToMarkdown(bundle);
        expect(md).toContain('# Patient Summary');
        expect(md).toContain('Summary narrative');
    });

    it('renders sections with titles and text', () => {
        const bundle: TBundle = {
            resourceType: 'Bundle',
            type: 'collection',
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
                    } as TComposition
                }
            ]
        };
        const md = ipsBundleToMarkdown(bundle);
        expect(md).toContain('## Allergies');
        expect(md).toContain('Peanut allergy');
        expect(md).toContain('## Section 2');
        expect(md).toContain('No known conditions');
    });

    it('lists resources by type and includes Patient names', () => {
        const bundle: TBundle = {
            resourceType: 'Bundle',
            type: 'collection',
            entry: [
                {
                    resource: {
                        resourceType: 'Composition',
                        title: 'Summary'
                    } as TComposition
                },
                {
                    resource: {
                        resourceType: 'Patient',
                        id: 'pat1',
                        name: [
                            { given: ['John'], family: 'Doe' }
                        ]
                    } as TPatient
                },
                {
                    resource: {
                        resourceType: 'Observation',
                        id: 'obs1'
                    } as TObservation
                },
                {
                    resource: {
                        resourceType: 'Patient',
                        id: 'pat2',
                        name: [
                            { given: ['Jane'], family: 'Smith' }
                        ]
                    } as TPatient
                }
            ]
        };
        const md = ipsBundleToMarkdown(bundle);
        expect(md).toContain('### Patient (2)');
        expect(md).toContain('**pat1** - John Doe');
        expect(md).toContain('**pat2** - Jane Smith');
        expect(md).toContain('### Observation (1)');
        expect(md).toContain('**obs1**');
    });

    it('handles missing Patient name gracefully', () => {
        const bundle: TBundle = {
            resourceType: 'Bundle',
            type: 'collection',
            entry: [
                { resource: { resourceType: 'Composition', title: 'Summary' } as TComposition },
                { resource: { resourceType: 'Patient', id: 'pat1' } as TPatient }
            ]
        };
        const md = ipsBundleToMarkdown(bundle);
        expect(md).toContain('**pat1**');
    });

    it('handles empty or missing entries', () => {
        const bundle1: TBundle = { resourceType: 'Bundle', type: 'collection' };
        const bundle2: TBundle = { resourceType: 'Bundle', type: 'collection', entry: [] };
        expect(ipsBundleToMarkdown(bundle1)).toMatch(/^# No Composition resource found/);
        expect(ipsBundleToMarkdown(bundle2)).toMatch(/^# No Composition resource found/);
    });
});
