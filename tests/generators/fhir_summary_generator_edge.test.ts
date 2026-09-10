import { ComprehensiveIPSCompositionBuilder } from '../../src/generators/fhir_summary_generator';
import { TPatient } from '../../src/types/resources/Patient';
import { TObservation } from '../../src/types/resources/Observation';
import { TComposition } from '../../src/types/resources/Composition';
import { TBundle } from '../../src/types/resources/Bundle';
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

  it('uses the LOINC system for section codes', async () => {
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

    const bundle = await builder.buildBundleAsync('org-1', 'Test Org', 'https://example.com/fhir', undefined);
    const composition = bundle.entry?.find(
      entry => entry.resource?.resourceType === 'Composition'
    )?.resource as TComposition;

    const problemSection = composition.section?.find(s => s.code?.coding?.[0]?.code === '11450-4');
    expect(problemSection?.code?.coding?.[0]?.system).toBe('http://loinc.org');
  });

  it('does not report Observation as a missing resource type when an Observation is present', () => {
    const builder = new ComprehensiveIPSCompositionBuilder();
    const patient: TPatient = {
      resourceType: 'Patient',
      id: 'p1',
      name: [{ family: 'Doe', given: ['John'] }],
    };
    const observation: TObservation = {
      resourceType: 'Observation',
      id: 'obs-1',
      status: 'final',
      subject: { reference: 'Patient/p1' },
      code: { coding: [{ system: 'http://loinc.org', code: '8867-4', display: 'Heart rate' }] },
      effectiveDateTime: '2026-01-03T08:00:00Z',
      valueQuantity: { value: 75, unit: 'bpm' },
    };
    const bundle: TBundle = {
      resourceType: 'Bundle',
      type: 'collection',
      entry: [{ resource: patient }, { resource: observation }],
    };

    const remaining = builder.getRemainingResourcesFromCompositionBundle(bundle);
    expect(remaining).not.toContain('Observation');
  });

  it('reports Observation as missing when no Observation of any kind is present', () => {
    const builder = new ComprehensiveIPSCompositionBuilder();
    const patient: TPatient = {
      resourceType: 'Patient',
      id: 'p1',
      name: [{ family: 'Doe', given: ['John'] }],
    };
    const bundle: TBundle = {
      resourceType: 'Bundle',
      type: 'collection',
      entry: [{ resource: patient }],
    };

    const remaining = builder.getRemainingResourcesFromCompositionBundle(bundle);
    expect(remaining).toContain('Observation');
  });
});

