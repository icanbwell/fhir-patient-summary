import { TemplateUtilities } from '../../src/narratives/templates/typescript/TemplateUtilities';
import { TObservation } from '../../src/types/resources/Observation';

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
