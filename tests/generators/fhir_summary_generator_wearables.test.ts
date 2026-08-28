import { ComprehensiveIPSCompositionBuilder } from '../../src/generators/fhir_summary_generator';
import { TPatient } from '../../src/types/resources/Patient';
import { TObservation } from '../../src/types/resources/Observation';
import { TBundle } from '../../src/types/resources/Bundle';

describe('wearable-tagged Observations and remaining-resources detection', () => {
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
