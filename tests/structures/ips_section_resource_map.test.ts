import { IPSSectionResourceHelper, IPSSectionResourceFilters } from '../../src/structures/ips_section_resource_map';
import { IPSSections } from '../../src/structures/ips_sections';

describe('IPSSectionResourceHelper', () => {
  it('should get section resources using helper', () => {
    const resources = [
      { resourceType: 'Patient' },
      { resourceType: 'AllergyIntolerance' },
    ];
    const result = IPSSectionResourceHelper.getSectionResources(IPSSections.ALLERGIES, resources);
    expect(result[0].resourceType).toBe('AllergyIntolerance');
    expect(result).toHaveLength(1);
  });

  it('should filter resources by section', () => {
    const filter = IPSSectionResourceFilters[IPSSections.ALLERGIES];
    const mockResource = { resourceType: 'AllergyIntolerance' };
    expect(filter && filter(mockResource)).toBe(true);
    expect(filter).toBeInstanceOf(Function);
  });

  it('should return false for non-matching resource', () => {
    const filter = IPSSectionResourceFilters[IPSSections.ALLERGIES];
    const mockResource = { resourceType: 'Patient' };
    expect(filter && filter(mockResource)).toBe(false);
  });
});
