import { NarrativeGenerator } from '../../src/generators/narrative_generator';
import { TDomainResource } from '../../src/types/resources/DomainResource';
import { IPSSections } from '../../src/structures/ips_sections';

describe('NarrativeGenerator edge cases', () => {
  it('should return undefined for empty resources', async () => {
    const result = await NarrativeGenerator.generateNarrativeContentAsync(IPSSections.ALLERGIES, [], 'America/New_York');
    expect(result).toBeUndefined();
  });

  it('should handle invalid section gracefully', async () => {
    // @ts-expect-error Invalid section type for test
    const result = await NarrativeGenerator.generateNarrativeContentAsync('UNKNOWN_SECTION', [{ resourceType: 'Patient' } as TDomainResource], 'America/New_York');
    expect(result).toContain('Error generating narrative: No template found for section: UNKNOWN_SECTION');
  });
});
