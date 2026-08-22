import { IPSSections } from '../../src/structures/ips_sections';
import {
  IPS_SECTION_LOINC_CODES,
  IPS_SECTION_DISPLAY_NAMES,
  IPS_SECTION_CODE_SYSTEMS,
  WEARABLE_VENDOR_SECURITY_SYSTEM,
  WEARABLE_VENDOR_CODES,
  DISPLAY_GROUP_CATEGORY_SYSTEM,
  LOINC_SYSTEM,
} from '../../src/structures/ips_section_loinc_codes';

describe('WEARABLES section constants', () => {
  it('registers the WEARABLES enum value', () => {
    expect(IPSSections.WEARABLES).toBe('WearableDeviceDataSection');
  });

  it('has a local code and display name', () => {
    expect(IPS_SECTION_LOINC_CODES[IPSSections.WEARABLES]).toBe('wearables');
    expect(IPS_SECTION_DISPLAY_NAMES[IPSSections.WEARABLES]).toBe('Wearable Device Data');
  });

  it('overrides the code system to a b.well-local namespace for WEARABLES only', () => {
    expect(IPS_SECTION_CODE_SYSTEMS[IPSSections.WEARABLES]).toBe('https://www.icanbwell.com/ips-section-codes');
    expect(IPS_SECTION_CODE_SYSTEMS[IPSSections.VITAL_SIGNS]).toBeUndefined();
  });

  it('defines the vendor and display-group constants', () => {
    expect(WEARABLE_VENDOR_SECURITY_SYSTEM).toBe('https://www.icanbwell.com/vendor');
    expect(WEARABLE_VENDOR_CODES).toEqual(['validic']);
    expect(DISPLAY_GROUP_CATEGORY_SYSTEM).toBe('https://www.icanbwell.com/display-group');
    expect(LOINC_SYSTEM).toBe('http://loinc.org');
  });
});
