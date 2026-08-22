import { ComprehensiveIPSCompositionBuilder } from '../../src/generators/fhir_summary_generator';
import { TPatient } from '../../src/types/resources/Patient';
import { TObservation } from '../../src/types/resources/Observation';
import { TComposition } from '../../src/types/resources/Composition';
import { TBundle } from '../../src/types/resources/Bundle';

describe('Wearable Device Data section end-to-end', () => {
  const patient: TPatient = {
    resourceType: 'Patient',
    id: 'wearable-patient-01',
    name: [{ family: 'Doe', given: ['Jane'] }],
  };

  const heartRateObservation = (id: string, value: number, date: string): TObservation => ({
    resourceType: 'Observation',
    id,
    status: 'final',
    subject: { reference: 'Patient/wearable-patient-01' },
    code: { coding: [{ system: 'http://loinc.org', code: '8867-4', display: 'Heart rate' }] },
    category: [
      { coding: [{ system: 'http://terminology.hl7.org/CodeSystem/observation-category', code: 'vital-signs' }] },
      { coding: [{ system: 'https://www.icanbwell.com/display-group', code: 'cardiovascular', display: 'Cardiovascular' }] },
    ],
    effectiveDateTime: date,
    valueQuantity: { value, unit: 'bpm' },
    meta: {
      security: [
        { system: 'https://www.icanbwell.com/owner', code: 'Fitbit' },
        { system: 'https://www.icanbwell.com/vendor', code: 'validic' },
      ],
    },
  });

  const clinicalHeartRateObservation: TObservation = {
    resourceType: 'Observation',
    id: 'clinic-hr-1',
    status: 'final',
    subject: { reference: 'Patient/wearable-patient-01' },
    code: { coding: [{ system: 'http://loinc.org', code: '8867-4', display: 'Heart rate' }] },
    category: [{ coding: [{ system: 'http://terminology.hl7.org/CodeSystem/observation-category', code: 'vital-signs' }] }],
    effectiveDateTime: '2026-01-05T09:00:00Z',
    valueQuantity: { value: 68, unit: 'bpm' },
  };

  const bundle: TBundle = {
    resourceType: 'Bundle',
    type: 'collection',
    entry: [
      { resource: patient },
      { resource: heartRateObservation('wear-hr-1', 72, '2026-01-01T08:00:00Z') },
      { resource: heartRateObservation('wear-hr-2', 80, '2026-01-02T08:00:00Z') },
      { resource: clinicalHeartRateObservation },
    ],
  };

  it('produces a Wearable Device Data section with the local code system, and keeps the clinical reading in Vital Signs only', async () => {
    const builder = new ComprehensiveIPSCompositionBuilder().setPatient(patient);
    await builder.readBundleAsync(bundle, 'UTC');

    const outputBundle = await builder.buildBundleAsync('org-1', 'Test Org', 'https://example.com/fhir', 'UTC');
    const composition = outputBundle.entry?.find(
      (entry) => entry.resource?.resourceType === 'Composition'
    )?.resource as TComposition;

    const wearablesSection = composition.section?.find((s) => s.code?.coding?.[0]?.code === 'wearables');
    expect(wearablesSection).toBeDefined();
    expect(wearablesSection?.code?.coding?.[0]?.system).toBe('https://www.icanbwell.com/ips-section-codes');
    expect(wearablesSection?.title).toBe('Wearable Device Data');
    expect(wearablesSection?.text?.div).toContain('Heart rate');
    expect(wearablesSection?.entry).toHaveLength(2); // only the two Validic-tagged readings, not the clinical one

    const vitalSignsSection = composition.section?.find((s) => s.code?.coding?.[0]?.code === '8716-3');
    expect(vitalSignsSection?.entry).toHaveLength(1); // only the untagged clinical reading
  });

  it('does not report Observation as a missing resource type when only wearable data is present', () => {
    const builder = new ComprehensiveIPSCompositionBuilder();
    const wearableOnlyBundle: TBundle = {
      resourceType: 'Bundle',
      type: 'collection',
      entry: [
        { resource: patient },
        { resource: heartRateObservation('wear-hr-3', 75, '2026-01-03T08:00:00Z') },
      ],
    };
    const remaining = builder.getRemainingResourcesFromCompositionBundle(wearableOnlyBundle);
    expect(remaining).not.toContain('Observation');
  });

  it('reports Observation as missing when no Observation of any kind is present', () => {
    const builder = new ComprehensiveIPSCompositionBuilder();
    const patientOnlyBundle: TBundle = {
      resourceType: 'Bundle',
      type: 'collection',
      entry: [{ resource: patient }],
    };
    const remaining = builder.getRemainingResourcesFromCompositionBundle(patientOnlyBundle);
    expect(remaining).toContain('Observation');
  });
});
