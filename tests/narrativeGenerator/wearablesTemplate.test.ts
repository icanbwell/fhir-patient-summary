import { TemplateUtilities } from '../../src/narratives/templates/typescript/TemplateUtilities';
import { TObservation } from '../../src/types/resources/Observation';
import { WearablesTemplate } from '../../src/narratives/templates/typescript/WearablesTemplate';
import { TDomainResource } from '../../src/types/resources/DomainResource';
import { TypeScriptTemplateMapper } from '../../src/narratives/templates/typescript/TypeScriptTemplateMapper';
import { IPSSections } from '../../src/structures/ips_sections';

describe('TemplateUtilities.getDisplayGroupCategory', () => {
  it('reads the display-group category coding off an Observation', () => {
    const templateUtilities = new TemplateUtilities([]);
    const observation: TObservation = {
      resourceType: 'Observation',
      status: 'final',
      code: { coding: [{ system: 'http://loinc.org', code: '8867-4', display: 'Heart rate' }] },
      category: [
        { coding: [{ system: 'http://terminology.hl7.org/CodeSystem/observation-category', code: 'vital-signs' }] },
        { coding: [{ system: 'https://www.icanbwell.com/display-group', code: 'cardiovascular', display: 'Cardiovascular' }] },
      ],
    };
    expect(templateUtilities.getDisplayGroupCategory(observation)).toBe('cardiovascular');
  });

  it('returns undefined when no display-group category coding is present', () => {
    const templateUtilities = new TemplateUtilities([]);
    const observation: TObservation = {
      resourceType: 'Observation',
      status: 'final',
      code: { coding: [{ system: 'http://loinc.org', code: '8310-5', display: 'Body temperature' }] },
      category: [{ coding: [{ code: 'vital-signs' }] }],
    };
    expect(templateUtilities.getDisplayGroupCategory(observation)).toBeUndefined();
  });
});

describe('WearablesTemplate', () => {
  const heartRateObservation = (id: string, value: number, date: string): TObservation => ({
    resourceType: 'Observation',
    id,
    status: 'final',
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

  const stepsObservation = (id: string, value: number, date: string): TObservation => ({
    resourceType: 'Observation',
    id,
    status: 'final',
    code: { coding: [{ system: 'http://loinc.org', code: '41950-7', display: 'Number of steps 24H' }] },
    category: [
      { coding: [{ system: 'http://terminology.hl7.org/CodeSystem/observation-category', code: 'activity' }] },
      { coding: [{ system: 'https://www.icanbwell.com/display-group', code: 'activity', display: 'Activity' }] },
    ],
    effectiveDateTime: date,
    valueQuantity: { value, unit: 'steps' },
    meta: {
      security: [
        { system: 'https://www.icanbwell.com/owner', code: 'Fitbit' },
        { system: 'https://www.icanbwell.com/vendor', code: 'validic' },
      ],
    },
  });

  it('returns undefined when there are no Observations', () => {
    const template = new WearablesTemplate();
    expect(template.generateNarrative([], undefined)).toBeUndefined();
  });

  it('aggregates multiple readings of the same metric into one row', () => {
    const resources: TDomainResource[] = [
      heartRateObservation('hr-1', 72, '2026-01-01T08:00:00Z'),
      heartRateObservation('hr-2', 80, '2026-01-02T08:00:00Z'),
    ];
    const template = new WearablesTemplate();
    const html = template.generateNarrative(resources, 'UTC');

    expect(html).toBeDefined();
    expect(html).toContain('Heart rate');
    expect(html).toContain('Cardiovascular');
    expect(html).toContain('76 bpm'); // average of 72 and 80
    expect(html).toContain('72 bpm'); // min
    expect(html).toContain('80 bpm'); // max, also the latest value
    expect(html).toContain('<td>2</td>'); // reading count
    expect(html).toContain('Fitbit');
  });

  it('groups different metrics under separate category headers', () => {
    const resources: TDomainResource[] = [
      heartRateObservation('hr-1', 72, '2026-01-01T08:00:00Z'),
      stepsObservation('steps-1', 5000, '2026-01-01T08:00:00Z'),
    ];
    const template = new WearablesTemplate();
    const html = template.generateNarrative(resources, 'UTC');

    expect(html).toBeDefined();
    expect(html).toContain('<h4>Cardiovascular</h4>');
    expect(html).toContain('<h4>Activity</h4>');
  });

  it('buckets metrics with no display-group category under "Other"', () => {
    const observation: TObservation = {
      resourceType: 'Observation',
      id: 'weight-1',
      status: 'final',
      code: { coding: [{ system: 'http://loinc.org', code: '29463-7', display: 'Body weight' }] },
      effectiveDateTime: '2026-01-01T08:00:00Z',
      valueQuantity: { value: 70, unit: 'kg' },
      meta: { security: [{ system: 'https://www.icanbwell.com/vendor', code: 'validic' }] },
    };
    const template = new WearablesTemplate();
    const html = template.generateNarrative([observation], 'UTC');

    expect(html).toContain('<h4>Other</h4>');
  });

  it('still renders a row for an Observation with no numeric value at all', () => {
    // No valueQuantity, no other value[x], no dataAbsentReason: extractObservationValue
    // returns null. The row must still appear (not be silently dropped) - the "Latest"
    // cell falls back to an em dash, but the metric/count/date-range info is real.
    const observation: TObservation = {
      resourceType: 'Observation',
      id: 'no-value',
      status: 'final',
      code: { coding: [{ system: 'http://loinc.org', code: '8867-4', display: 'Heart rate' }] },
      meta: { security: [{ system: 'https://www.icanbwell.com/vendor', code: 'validic' }] },
    };
    const template = new WearablesTemplate();
    const html = template.generateNarrative([observation], 'UTC');

    expect(html).toBeDefined();
    expect(html).toContain('Heart rate');
    expect(html).toContain('<td>—</td>'); // Latest falls back to em dash
    expect(html).toContain('<td>1</td>'); // reading count is still shown
  });

  it('renders a row using extractObservationValue for a non-numeric (valueCodeableConcept) reading, without full aggregates', () => {
    const observation: TObservation = {
      resourceType: 'Observation',
      id: 'sleep-quality-1',
      status: 'final',
      code: { coding: [{ system: 'http://loinc.org', code: '93832-4', display: 'Sleep quality' }] },
      category: [
        { coding: [{ system: 'https://www.icanbwell.com/display-group', code: 'sleep', display: 'Sleep' }] },
      ],
      effectiveDateTime: '2026-01-01T08:00:00Z',
      valueCodeableConcept: { text: 'Good' },
      meta: { security: [{ system: 'https://www.icanbwell.com/vendor', code: 'validic' }] },
    };
    const template = new WearablesTemplate();
    const html = template.generateNarrative([observation], 'UTC');

    expect(html).toBeDefined();
    expect(html).toContain('Sleep quality');
    expect(html).toContain('<td>Good</td>'); // Latest column uses extractObservationValue
    expect(html).toContain('<td>—</td>'); // Average/Min/Max are not computable
    expect(html).toContain('<td>1</td>'); // reading count
  });

  it('renders a row for a wearable blood-pressure reading (component-based, no top-level valueQuantity)', () => {
    const observation: TObservation = {
      resourceType: 'Observation',
      id: 'bp-1',
      status: 'final',
      code: { coding: [{ system: 'http://loinc.org', code: '85354-9', display: 'Blood pressure panel' }] },
      category: [
        { coding: [{ system: 'https://www.icanbwell.com/display-group', code: 'cardiovascular', display: 'Cardiovascular' }] },
      ],
      effectiveDateTime: '2026-01-01T08:00:00Z',
      component: [
        {
          code: { coding: [{ system: 'http://loinc.org', code: '8480-6', display: 'Systolic' }] },
          valueQuantity: { value: 120, unit: 'mmHg' },
        },
        {
          code: { coding: [{ system: 'http://loinc.org', code: '8462-4', display: 'Diastolic' }] },
          valueQuantity: { value: 80, unit: 'mmHg' },
        },
      ],
      meta: { security: [{ system: 'https://www.icanbwell.com/vendor', code: 'validic' }] },
    };
    const template = new WearablesTemplate();
    const html = template.generateNarrative([observation], 'UTC');

    expect(html).toBeDefined();
    expect(html).toContain('Blood pressure panel');
    // extractObservationValue formats blood pressure as "<systolic>/<diastolic>",
    // each already including its own unit - it must not be duplicated.
    expect(html).toContain('<td>120 mmHg/80 mmHg</td>');
  });

  it('computes min/max/average via reduce instead of Math.min/max spread, avoiding RangeError on large arrays', () => {
    // A year of minute-resolution heart-rate data is on the order of 5*10^5 readings.
    // Math.min(...values)/Math.max(...values) throws RangeError at this scale because
    // spread turns into function arguments. This proves the reduce-based implementation
    // handles it without issue and still computes the correct min/max/average.
    const readingCount = 200_000;
    const resources: TDomainResource[] = Array.from({ length: readingCount }, (_, i) =>
      heartRateObservation(`hr-${i}`, (i % 100) + 40, new Date(2026, 0, 1, 0, i).toISOString())
    );
    const template = new WearablesTemplate();

    let html: string | undefined;
    expect(() => {
      html = template.generateNarrative(resources, 'UTC');
    }).not.toThrow();

    expect(html).toBeDefined();
    expect(html).toContain('<td>40 bpm</td>'); // min
    expect(html).toContain('<td>139 bpm</td>'); // max
    expect(html).toContain(`<td>${readingCount}</td>`); // reading count
  });
});

describe('TypeScriptTemplateMapper WEARABLES registration', () => {
  it('dispatches WEARABLES resources to WearablesTemplate', () => {
    const observation: TObservation = {
      resourceType: 'Observation',
      id: 'hr-1',
      status: 'final',
      code: { coding: [{ system: 'http://loinc.org', code: '8867-4', display: 'Heart rate' }] },
      category: [{ coding: [{ system: 'https://www.icanbwell.com/display-group', code: 'cardiovascular' }] }],
      effectiveDateTime: '2026-01-01T08:00:00Z',
      valueQuantity: { value: 72, unit: 'bpm' },
      meta: { security: [{ system: 'https://www.icanbwell.com/vendor', code: 'validic' }] },
    };
    const html = TypeScriptTemplateMapper.generateNarrative(IPSSections.WEARABLES, [observation], 'UTC');
    expect(html).toContain('Heart rate');
  });

  it('falls back to generateNarrative instead of throwing when useSectionSummary is true for WEARABLES', () => {
    // WearablesTemplate only implements ITemplate, not ISummaryTemplate (there is no
    // summary-composition path for this section). A caller invoking the mapper
    // directly with useSectionSummary: true must not hit a TypeError from an
    // unchecked cast to ISummaryTemplate - it should fall back to generateNarrative.
    const observation: TObservation = {
      resourceType: 'Observation',
      id: 'hr-1',
      status: 'final',
      code: { coding: [{ system: 'http://loinc.org', code: '8867-4', display: 'Heart rate' }] },
      category: [{ coding: [{ system: 'https://www.icanbwell.com/display-group', code: 'cardiovascular' }] }],
      effectiveDateTime: '2026-01-01T08:00:00Z',
      valueQuantity: { value: 72, unit: 'bpm' },
      meta: { security: [{ system: 'https://www.icanbwell.com/vendor', code: 'validic' }] },
    };

    let html: string | undefined;
    expect(() => {
      html = TypeScriptTemplateMapper.generateNarrative(IPSSections.WEARABLES, [observation], 'UTC', true);
    }).not.toThrow();

    expect(html).toContain('Heart rate');
  });
});
