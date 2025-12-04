import { IPSResourceProfileRegistry } from '../../src/profiles/ips_resource_profile_registry';
import { IPSMandatorySections } from '../../src/structures/ips_mandatory_sections';

describe('IPSResourceProfileRegistry', () => {
  it('should return correct profile for mandatory sections', () => {
    const patientProfile = IPSResourceProfileRegistry.PROFILES[IPSMandatorySections.PATIENT];
    expect(patientProfile.resourceType).toBe('Patient');
    expect(patientProfile.loincCode).toBe('60591-5');
    expect(patientProfile.profileUrl).toContain('Patient-uv-ips');
  });

  it('should return correct profile for allergies section', () => {
    const allergyProfile = IPSResourceProfileRegistry.PROFILES[IPSMandatorySections.ALLERGIES];
    expect(allergyProfile.resourceType).toBe('AllergyIntolerance');
    expect(allergyProfile.mandatoryFields).toContain('patient');
    expect(allergyProfile.loincCode).toBe('48765-2');
  });

  it('should have recommended fields for medications section', () => {
    const medProfile = IPSResourceProfileRegistry.PROFILES[IPSMandatorySections.MEDICATIONS];
    expect(medProfile.recommendedFields).toContain('medicationCodeableConcept');
  });

  it('should return undefined for unknown section', () => {
    // @ts-expect-error Testing unknown section access
    expect(IPSResourceProfileRegistry.PROFILES['UNKNOWN_SECTION']).toBeUndefined();
  });
});
