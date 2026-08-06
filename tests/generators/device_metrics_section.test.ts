import { ComprehensiveIPSCompositionBuilder } from '../../src/generators/fhir_summary_generator';
import { IPSSections } from '../../src/structures/ips_sections';
import { IPS_SECTION_LOINC_CODES } from '../../src/structures/ips_section_loinc_codes';
import { TBundle } from '../../src/types/resources/Bundle';
import { TComposition } from '../../src/types/resources/Composition';
import { TObservation } from '../../src/types/resources/Observation';
import { TPatient } from '../../src/types/resources/Patient';

/**
 * The Personal Health Monitoring Devices section is built from a curated
 * `device_metric_summary_document` Composition produced upstream, whose
 * top-level sections are one-per-metric and already sorted most-recent-first.
 */
describe('DeviceMetricsSection', () => {
  const patient: TPatient = {
    resourceType: 'Patient',
    id: 'patient-1',
    name: [{ family: 'Doe', given: ['Jane'] }],
    gender: 'female',
    birthDate: '1980-01-01',
  };

  const quietLogger = { info: () => {}, error: () => {} } as unknown as Console;

  /** Builds N observations for one metric, newest first. */
  const observationsFor = (
    prefix: string,
    code: string,
    display: string,
    count: number
  ): TObservation[] =>
    Array.from(
      { length: count },
      (_, i) =>
        ({
          resourceType: 'Observation',
          id: `${prefix}-${i}`,
          status: 'final',
          code: { coding: [{ system: 'http://loinc.org', code, display }] },
          subject: { reference: 'Patient/patient-1' },
          // Descending: index 0 is the most recent.
          effectiveDateTime: `2026-01-${String(28 - i).padStart(2, '0')}T00:00:00Z`,
          valueQuantity: { value: 60 + i, unit: 'count/min' },
          device: { reference: 'Device/oura' },
        }) as TObservation
    );

  /** Mirrors the real Composition shape: metric section -> column sub-sections + entries. */
  const metricSection = (
    title: string,
    code: string,
    observations: TObservation[]
  ) => ({
    title,
    code: { coding: [{ system: 'http://loinc.org', code, display: title }] },
    orderedBy: {
      text: 'Sorted by effectiveDateTime|effectivePeriod.start DESC',
    },
    section: [
      {
        title: 'Device',
        text: { status: 'generated', div: '<div>Device/oura</div>' },
      },
      {
        title: 'Metric Name',
        text: { status: 'generated', div: `<div>${title}</div>` },
      },
      {
        title: 'Source',
        text: { status: 'generated', div: '<div>device-data-ingest</div>' },
      },
      {
        title: 'effectiveDateTime',
        text: {
          status: 'generated',
          div: `<div>${observations[0].effectiveDateTime}</div>`,
        },
      },
      {
        title: 'valueQuantity.value',
        text: {
          status: 'generated',
          div: `<div>${observations[0].valueQuantity?.value}</div>`,
        },
      },
      {
        title: 'valueQuantity.unit',
        text: { status: 'generated', div: '<div>count/min</div>' },
      },
    ],
    entry: observations.map(o => ({ reference: `Observation/${o.id}` })),
  });

  const heartRate = observationsFor('hr', '8867-4', 'Heart rate', 15);
  const bodyWeight = observationsFor('wt', '29463-7', 'Body weight', 2);

  const deviceComposition = {
    resourceType: 'Composition',
    id: 'device-metrics-1',
    status: 'final',
    type: {
      coding: [
        {
          system: 'https://fhir.icanbwell.com/4_0_0/CodeSystem/composition/',
          code: 'device_metric_summary_document',
        },
        {
          system:
            'https://fhir.icanbwell.com/4_0_0/CodeSystem/composition/type',
          code: 'device_metric_group_code',
        },
      ],
    },
    subject: { reference: 'Patient/patient-1' },
    section: [
      metricSection('Heart rate', '8867-4', heartRate),
      metricSection('Body weight', '29463-7', bodyWeight),
    ],
  } as unknown as TComposition;

  const buildBundle = (extra: unknown[] = []): TBundle =>
    ({
      resourceType: 'Bundle',
      type: 'collection',
      entry: [
        { resource: patient },
        ...heartRate.map(r => ({ resource: r })),
        ...bodyWeight.map(r => ({ resource: r })),
        ...extra.map(r => ({ resource: r })),
      ],
    }) as unknown as TBundle;

  const buildSection = async (
    bundle: TBundle,
    useSummaryCompositions = true,
    includeSummaryCompositionOnly = false
  ) => {
    const builder = new ComprehensiveIPSCompositionBuilder();
    await builder.readBundleAsync(
      bundle,
      'UTC',
      useSummaryCompositions,
      includeSummaryCompositionOnly,
      quietLogger
    );
    const out = await builder.buildBundleAsync(
      'org-1',
      'b.well',
      'https://example.com',
      'UTC',
      includeSummaryCompositionOnly
    );
    const composition = (out.entry ?? [])
      .map(e => e.resource)
      .find(r => r?.resourceType === 'Composition') as TComposition | undefined;
    return composition?.section?.find(
      s =>
        s.code?.coding?.[0]?.code ===
        IPS_SECTION_LOINC_CODES[IPSSections.DEVICE_METRICS]
    );
  };

  beforeEach(() => {
    process.env.SUMMARY_COMPOSITION_SECTIONS = 'all';
  });

  it('caps each metric independently so a high-frequency one cannot crowd out a low-frequency one', async () => {
    const section = await buildSection(buildBundle([deviceComposition]));

    expect(section).toBeDefined();
    const refs = (section?.entry ?? []).map(e => e.reference);

    // Heart rate capped at 10 of 15; both body-weight readings survive.
    expect(refs.filter(r => r?.startsWith('Observation/hr-'))).toHaveLength(10);
    expect(refs.filter(r => r?.startsWith('Observation/wt-'))).toHaveLength(2);

    // The 10 kept are the most recent (hr-0..hr-9), not an arbitrary slice.
    expect(refs).toContain('Observation/hr-0');
    expect(refs).toContain('Observation/hr-9');
    expect(refs).not.toContain('Observation/hr-10');
  });

  // includeSummaryCompositionOnly is a real production mode (fhir-server calls
  // `$summary?_includeSummaryCompositionOnly=true`). It selects entries via a
  // different branch that builds stub resources without consulting the bundle,
  // so the cap has to be enforced there too.
  it('caps each metric in includeSummaryCompositionOnly mode as well', async () => {
    const section = await buildSection(
      buildBundle([deviceComposition]),
      true,
      true
    );

    expect(section).toBeDefined();
    const refs = (section?.entry ?? []).map(e => e.reference);

    expect(refs.filter(r => r?.startsWith('Observation/hr-'))).toHaveLength(10);
    expect(refs.filter(r => r?.startsWith('Observation/wt-'))).toHaveLength(2);
    expect(refs).not.toContain('Observation/hr-10');
  });

  it('renders one narrative row per metric, naming the source device', async () => {
    const section = await buildSection(buildBundle([deviceComposition]));

    const div = section?.text?.div ?? '';
    // One row per metric plus the header row.
    expect((div.match(/<tr>/g) ?? []).length).toBe(3);
    expect(div).toContain('Heart rate');
    expect(div).toContain('Body weight');
    expect(div).toContain('Device/oura');
  });

  it('uses the section title and LOINC code the SHL viewer expects', async () => {
    const section = await buildSection(buildBundle([deviceComposition]));

    expect(section?.code?.coding?.[0]?.code).toBe('82611-5');
    expect(section?.title).toBe('Personal Health Monitoring Devices');
  });

  it('omits the section entirely when no device-metric Composition is present', async () => {
    // Observations carrying .device are present, but without the curated
    // Composition there is no safe way to classify them — .device also
    // covers lab analyzers and clinic equipment — so nothing is emitted.
    const section = await buildSection(buildBundle());

    expect(section).toBeUndefined();
  });
});
