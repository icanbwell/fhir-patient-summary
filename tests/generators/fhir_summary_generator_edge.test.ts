import { ComprehensiveIPSCompositionBuilder } from '../../src/generators/fhir_summary_generator';
import { TPatient } from '../../src/types/resources/Patient';
import { TComposition } from '../../src/types/resources/Composition';
import { IPSSections } from '../../src/structures/ips_sections';

describe('ComprehensiveIPSCompositionBuilder edge cases', () => {
  it('should throw error for invalid patient resource', () => {
    const builder = new ComprehensiveIPSCompositionBuilder();
    expect(() => builder.setPatient({} as TPatient)).toThrow('Invalid Patient resource');
    expect(() => builder.setPatient([])).toThrow('Invalid Patient resource');
  });

  it('should handle empty patient array', () => {
    const builder = new ComprehensiveIPSCompositionBuilder();
    expect(() => builder.setPatient([] as TPatient[])).toThrow('Invalid Patient resource');
  });

  it('should allow valid patient resource', () => {
    const builder = new ComprehensiveIPSCompositionBuilder();
    const patient: TPatient = {
      resourceType: 'Patient',
      id: 'p1',
      name: [{ family: 'Doe', given: ['John'] }],
      gender: 'male',
      birthDate: '1980-01-01',
      identifier: []
    };
    expect(() => builder.setPatient(patient)).not.toThrow();
  });

  it('renders the "no information available" placeholder for a mandatory section with no resources', async () => {
    const builder = new ComprehensiveIPSCompositionBuilder();
    const patient: TPatient = {
      resourceType: 'Patient',
      id: 'p1',
      name: [{ family: 'Doe', given: ['John'] }]
    };
    builder.setPatient(patient);
    await builder.makeSectionAsync(IPSSections.PATIENT, [patient], undefined);
    await builder.makeSectionAsync(IPSSections.PROBLEMS, [], undefined);

    const bundle = await builder.buildBundleAsync('org-1', 'Test Org', 'https://example.com/fhir', undefined);
    const composition = bundle.entry?.find(
      entry => entry.resource?.resourceType === 'Composition'
    )?.resource as TComposition;
    const problemSection = composition.section?.find(
      section => section.code?.coding?.[0]?.code === '11450-4'
    );

    expect(problemSection).toBeDefined();
    expect(problemSection?.text?.div).toContain(
      "no information available about the subject's health problems"
    );
    expect(problemSection?.entry).toEqual([]);
  });

  it('uses the LOINC system for existing sections and a local system for WEARABLES', async () => {
    const builder = new ComprehensiveIPSCompositionBuilder();
    const patient: TPatient = {
      resourceType: 'Patient',
      id: 'p1',
      name: [{ family: 'Doe', given: ['John'] }]
    };
    builder.setPatient(patient);
    await builder.makeSectionAsync(IPSSections.PATIENT, [patient], undefined);
    builder.addSectionAsync(
      { status: 'generated', div: '<div xmlns="http://www.w3.org/1999/xhtml"><p>none</p></div>' },
      IPSSections.PROBLEMS,
      []
    );
    builder.addSectionAsync(
      { status: 'generated', div: '<div xmlns="http://www.w3.org/1999/xhtml"><p>none</p></div>' },
      IPSSections.WEARABLES,
      []
    );

    const bundle = await builder.buildBundleAsync('org-1', 'Test Org', 'https://example.com/fhir', undefined);
    const composition = bundle.entry?.find(
      entry => entry.resource?.resourceType === 'Composition'
    )?.resource as TComposition;

    const problemSection = composition.section?.find(s => s.code?.coding?.[0]?.code === '11450-4');
    expect(problemSection?.code?.coding?.[0]?.system).toBe('http://loinc.org');

    const wearablesSection = composition.section?.find(s => s.code?.coding?.[0]?.code === 'wearables');
    expect(wearablesSection?.code?.coding?.[0]?.system).toBe('https://www.icanbwell.com/ips-section-codes');
    expect(wearablesSection?.title).toBe('Wearable Device Data');
  });
});

