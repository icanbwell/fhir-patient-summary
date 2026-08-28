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

  /**
   * Mirrors the real Composition shape: metric section -> column sub-sections
   * + entries. Column `text.div` values are bare, matching every other
   * summary-composition fixture in the repo (e.g.
   * tests/fhir-summary-bundle/fixtures/test-summary-bundle.json) — not
   * wrapped in a literal `<div>` element, which DeviceMetricsTemplate would
   * HTML-escape as untrusted text rather than parse as markup.
   */
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
        text: { status: 'generated', div: 'Device/oura' },
      },
      {
        title: 'Metric Name',
        text: { status: 'generated', div: title },
      },
      {
        title: 'Source',
        text: { status: 'generated', div: 'device-data-ingest' },
      },
      {
        title: 'effectiveDateTime',
        text: {
          status: 'generated',
          div: observations[0].effectiveDateTime,
        },
      },
      {
        title: 'valueQuantity.value',
        text: {
          status: 'generated',
          div: `${observations[0].valueQuantity?.value}`,
        },
      },
      {
        title: 'valueQuantity.unit',
        text: { status: 'generated', div: 'count/min' },
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

  /** A standalone Composition for the bodyWeight fixture, mirroring deviceComposition's second metric section but on its own — used where a test wants a metric with no display-group category tag alongside another Composition that does have one. */
  const bodyWeightComposition = (): TComposition =>
    ({
      ...(deviceComposition as unknown as Record<string, unknown>),
      id: 'device-metrics-bodyweight',
      section: [metricSection('Body weight', '29463-7', bodyWeight)],
    }) as unknown as TComposition;

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

  afterEach(() => {
    process.env.SUMMARY_COMPOSITION_SECTIONS = '';
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

  // The upstream pipeline emits one device-metric Composition per patient
  // today, but IPSSectionSummaryCompositionFilter matches ANY Composition
  // carrying device_metric_group_code — nothing prevents more than one from
  // matching. If a metric were split across two, each got its own 10-entry
  // budget (20 total) unless groups sharing a title are merged before capping.
  it('shares one cap budget for the same metric split across multiple compositions', async () => {
    const heartRate2 = observationsFor('hr2', '8867-4', 'Heart rate', 15);
    const secondDeviceComposition = {
      ...deviceComposition,
      id: 'device-metrics-2',
      section: [metricSection('Heart rate', '8867-4', heartRate2)],
    } as unknown as TComposition;

    const section = await buildSection(
      buildBundle([
        deviceComposition,
        secondDeviceComposition,
        ...heartRate2.map(o => o),
      ])
    );

    const refs = (section?.entry ?? [])
      .map(e => e.reference)
      .filter(r => r?.startsWith('Observation/hr'));
    expect(refs).toHaveLength(10);
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

  it('renders per-metric aggregate stats computed from the resolved Observations, grouped by category', async () => {
    const section = await buildSection(buildBundle([deviceComposition]));

    const div = section?.text?.div ?? '';
    expect(div).toContain('Heart rate');
    expect(div).toContain('Body weight');
    expect(div).toContain('Device/oura');
    // Latest: most recent heart-rate reading (hr-0: 60 count/min, 2026-01-28).
    expect(div).toContain('60 count/min');
    // Average across the 10 capped heart-rate readings (60..69): 64.5.
    expect(div).toContain('64.5 count/min');
    // Min/max across the capped 10 (60..69).
    expect(div).toContain('69 count/min');
    // Date range: earliest (hr-9, 2026-01-19) to latest (hr-0, 2026-01-28).
    expect(div).toContain('1/28/2026');
    expect(div).toContain('1/19/2026');
    // Reading count reflects the capped entry list, not the full 15 generated.
    expect(div).toContain('<td>10</td>');
    // No display-group category tag on the fixture Observations -> single "Other" bucket.
    expect(div).toContain('<h4>Other</h4>');
  });

  it('falls back to the Composition-embedded latest-value columns when the underlying Observations are not resolvable (stub-only mode)', async () => {
    const section = await buildSection(
      buildBundle([deviceComposition]),
      true,
      true // includeSummaryCompositionOnly: resources are stub placeholders, no real fields
    );

    const div = section?.text?.div ?? '';
    expect(div).toContain('Heart rate');
    // Latest still shows the Composition's own pre-rendered value/date, straight from its columns.
    expect(div).toContain('60 count/min');
    expect(div).toContain('1/28/2026');
    // No real Observations were resolvable, so the aggregate columns are not computable.
    expect(div).toContain('—');
  });

  it('computes average/min/max over valueInteger readings the same way as valueQuantity', async () => {
    const stepsObservations = Array.from({ length: 3 }, (_, i) => ({
      resourceType: 'Observation',
      id: `steps-${i}`,
      status: 'final',
      code: { coding: [{ system: 'http://loinc.org', code: '55423-8', display: 'Steps' }] },
      subject: { reference: 'Patient/patient-1' },
      effectiveDateTime: `2026-01-${String(20 + i).padStart(2, '0')}T00:00:00Z`,
      valueInteger: 1000 * (i + 1),
      device: { reference: 'Device/oura' },
    })) as unknown as TObservation[];
    const stepsComposition = {
      ...(deviceComposition as unknown as Record<string, unknown>),
      id: 'device-metrics-steps',
      section: [metricSection('Steps', '55423-8', stepsObservations)],
    } as unknown as TComposition;

    const section = await buildSection(
      buildBundle([stepsComposition, ...stepsObservations])
    );

    const div = section?.text?.div ?? '';
    // Average of 1000/2000/3000 is 2000; valueInteger has no unit.
    expect(div).toContain('<td>2000</td>');
    expect(div).toContain('<td>3000</td>');
    expect(div).toContain('<td>1000</td>');
  });

  it('groups metrics into real category headers (not just "Other") and sorts "Other" last', async () => {
    const cardioObservations = observationsFor('hr', '8867-4', 'Heart rate', 3).map(o => ({
      ...o,
      category: [
        { coding: [{ system: 'https://www.icanbwell.com/display-group', code: 'cardiovascular', display: 'Cardiovascular' }] },
      ],
    })) as TObservation[];
    const cardioComposition = {
      ...(deviceComposition as unknown as Record<string, unknown>),
      id: 'device-metrics-cardio',
      section: [metricSection('Heart rate', '8867-4', cardioObservations)],
    } as unknown as TComposition;

    const section = await buildSection(
      buildBundle([cardioComposition, bodyWeightComposition(), ...cardioObservations])
    );

    const div = section?.text?.div ?? '';
    const cardioIndex = div.indexOf('<h4>Cardiovascular</h4>');
    const otherIndex = div.indexOf('<h4>Other</h4>');
    expect(cardioIndex).toBeGreaterThan(-1);
    expect(otherIndex).toBeGreaterThan(-1);
    // "Other" always sorts last, regardless of alphabetical order.
    expect(cardioIndex).toBeLessThan(otherIndex);
  });

  it('renders a valuePeriod and a valueCodeableConcept reading as the Latest cell in the aggregate path', async () => {
    const sleepObservation: TObservation = {
      resourceType: 'Observation',
      id: 'sleep-period-1',
      status: 'final',
      code: { coding: [{ system: 'http://loinc.org', code: '93832-4', display: 'Sleep duration' }] },
      subject: { reference: 'Patient/patient-1' },
      effectiveDateTime: '2026-01-28T00:00:00Z',
      valuePeriod: { start: '2026-01-27T23:00:00Z', end: '2026-01-28T07:00:00Z' },
      device: { reference: 'Device/oura' },
    } as unknown as TObservation;
    const sleepComposition = {
      ...(deviceComposition as unknown as Record<string, unknown>),
      id: 'device-metrics-sleep',
      section: [metricSection('Sleep duration', '93832-4', [sleepObservation])],
    } as unknown as TComposition;

    const sleepStageObservation: TObservation = {
      resourceType: 'Observation',
      id: 'sleep-stage-1',
      status: 'final',
      code: { coding: [{ system: 'http://loinc.org', code: '93832-5', display: 'Sleep stage' }] },
      subject: { reference: 'Patient/patient-1' },
      effectiveDateTime: '2026-01-28T00:00:00Z',
      valueCodeableConcept: { coding: [{ system: 'http://loinc.org', code: 'LA6714-7', display: 'Deep sleep' }] },
      device: { reference: 'Device/oura' },
    } as unknown as TObservation;
    const sleepStageComposition = {
      ...(deviceComposition as unknown as Record<string, unknown>),
      id: 'device-metrics-sleep-stage',
      section: [metricSection('Sleep stage', '93832-5', [sleepStageObservation])],
    } as unknown as TComposition;

    const section = await buildSection(
      buildBundle([sleepComposition, sleepStageComposition, sleepObservation, sleepStageObservation])
    );

    const div = section?.text?.div ?? '';
    expect(div).toContain('Sleep duration');
    expect(div).toContain('Sleep stage');
    // A valuePeriod reading has no numeric value, so Average/Min/Max are not computable.
    expect(div).toContain('—');
    // The valuePeriod's Latest cell renders as a rendered date range, not the raw object.
    expect(div).toContain('1/27/2026');
    expect(div).toContain('1/28/2026');
    // The valueCodeableConcept's Latest cell renders its display text.
    expect(div).toContain('Deep sleep');
  });

  it('picks a unit from any observation in the group, not just the first, when computing Average/Min/Max', async () => {
    const mixedObservations: TObservation[] = [
      {
        resourceType: 'Observation',
        id: 'mixed-0',
        status: 'final',
        code: { coding: [{ system: 'http://loinc.org', code: '55423-8', display: 'Steps' }] },
        subject: { reference: 'Patient/patient-1' },
        effectiveDateTime: '2026-01-28T00:00:00Z',
        // First observation reports via valueInteger - no unit.
        valueInteger: 3000,
        device: { reference: 'Device/oura' },
      } as unknown as TObservation,
      {
        resourceType: 'Observation',
        id: 'mixed-1',
        status: 'final',
        code: { coding: [{ system: 'http://loinc.org', code: '55423-8', display: 'Steps' }] },
        subject: { reference: 'Patient/patient-1' },
        effectiveDateTime: '2026-01-27T00:00:00Z',
        // Later observation in the same group reports via valueQuantity with a unit.
        valueQuantity: { value: 1000, unit: 'steps' },
        device: { reference: 'Device/oura' },
      } as unknown as TObservation,
    ];
    const mixedComposition = {
      ...(deviceComposition as unknown as Record<string, unknown>),
      id: 'device-metrics-mixed-unit',
      section: [metricSection('Steps', '55423-8', mixedObservations)],
    } as unknown as TComposition;

    const section = await buildSection(buildBundle([mixedComposition, ...mixedObservations]));

    const div = section?.text?.div ?? '';
    // Average of 3000 and 1000 is 2000; min 1000; max 3000 - all should carry
    // the unit found on the second observation, not silently drop it because
    // the first observation in the array happened to have none.
    expect(div).toContain('2000 steps');
    expect(div).toContain('1000 steps');
    expect(div).toContain('3000 steps');
  });

  it('escapes untrusted resource text rather than emitting it as live HTML', async () => {
    // A malicious/mangled code system reaches the narrative via
    // codeableConceptCoding, which interpolates code + system verbatim.
    const injected = '<script>alert(1)</script>';
    const hostileComposition = {
      ...(deviceComposition as unknown as Record<string, unknown>),
      section: [
        {
          ...metricSection('Heart rate', '8867-4', heartRate),
          code: {
            coding: [{ system: injected, code: injected, display: 'Heart rate' }],
          },
        },
      ],
    } as unknown as TComposition;

    const section = await buildSection(buildBundle([hostileComposition]));
    const div = section?.text?.div ?? '';

    // `<` is escaped so no live tag can form. Note the narrative is minified
    // afterwards, which turns `&gt;` back into a bare `>` — harmless in text
    // content, so only the opening bracket is asserted on.
    expect(div).not.toContain('<script');
    expect(div).toContain('&lt;script');
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
