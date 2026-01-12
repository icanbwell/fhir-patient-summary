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

  it('should filter functional status resources correctly', () => {
    const filter = IPSSectionResourceFilters[IPSSections.FUNCTIONAL_STATUS];
    const mockCondition1 = {
      resourceType: 'Condition',
      category: [{ 
          coding: [{ code: 'problem-list-item' }],
      }],
      clinicalStatus: { coding: [{ code: 'active' }] }, 
      code: { coding: [{ code: '2219003', system: 'http://snomed.info/sct' }] }
    };
    const mockCondition2 = {
      resourceType: 'Condition',
      category: [{ 
          coding: [{ code: 'problem-list-item' }],
      }],
      clinicalStatus: { coding: [{ code: 'active' }] }, 
      code: { coding: [{ code: '12345', system: 'http://snomed.info/sct' }] }
    };
    const mockClinicalImpression = { resourceType: 'ClinicalImpression', status: 'completed' };
    const mockClinicalImpressionInactive = { resourceType: 'ClinicalImpression', status: 'draft' };
    const mockObservation = { resourceType: 'Observation' };
    expect(filter && filter(mockCondition1)).toBe(true);
    expect(filter && filter(mockCondition2)).toBe(false);
    expect(filter && filter(mockClinicalImpression)).toBe(true);
    expect(filter && filter(mockClinicalImpressionInactive)).toBe(false);
    expect(filter && filter(mockObservation)).toBe(false);
  });
});
