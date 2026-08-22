import { TemplateUtilities } from '../../src/narratives/templates/typescript/TemplateUtilities';
import { TObservation } from '../../src/types/resources/Observation';
import { WearablesTemplate } from '../../src/narratives/templates/typescript/WearablesTemplate';
import { TDomainResource } from '../../src/types/resources/DomainResource';

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

  it('skips Observations with no numeric value', () => {
    const observation: TObservation = {
      resourceType: 'Observation',
      id: 'no-value',
      status: 'final',
      code: { coding: [{ system: 'http://loinc.org', code: '8867-4', display: 'Heart rate' }] },
      meta: { security: [{ system: 'https://www.icanbwell.com/vendor', code: 'validic' }] },
    };
    const template = new WearablesTemplate();
    expect(template.generateNarrative([observation], 'UTC')).toBeUndefined();
  });
});
