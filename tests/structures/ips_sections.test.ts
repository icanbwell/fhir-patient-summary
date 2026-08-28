import {
  WEARABLE_VENDOR_SECURITY_SYSTEM,
  WEARABLE_VENDOR_CODES,
  DISPLAY_GROUP_CATEGORY_SYSTEM,
  LOINC_SYSTEM,
} from '../../src/structures/ips_section_loinc_codes';

describe('wearable-tagging constants', () => {
  it('defines the vendor and display-group constants', () => {
    expect(WEARABLE_VENDOR_SECURITY_SYSTEM).toBe('https://www.icanbwell.com/vendor');
    expect(WEARABLE_VENDOR_CODES).toEqual(['validic']);
    expect(DISPLAY_GROUP_CATEGORY_SYSTEM).toBe('https://www.icanbwell.com/display-group');
    expect(LOINC_SYSTEM).toBe('http://loinc.org');
  });
});
