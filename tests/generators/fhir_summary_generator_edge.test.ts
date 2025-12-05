import { ComprehensiveIPSCompositionBuilder } from '../../src/generators/fhir_summary_generator';
import { TPatient } from '../../src/types/resources/Patient';

describe('ComprehensiveIPSCompositionBuilder edge cases', () => {
  it('should throw error for invalid patient resource', () => {
    const builder = new ComprehensiveIPSCompositionBuilder();
    expect(() => builder.setPatient({} as TPatient)).toThrow('Invalid Patient resource');
    expect(() => builder.setPatient([])).toThrow('Invalid Patient resource');
  });

  it('should handle empty patient array', () => {
    const builder = new ComprehensiveIPSCompositionBuilder();
    expect(() => builder.setPatient([] as TPatient[])).toThrow('Invalid Patient resource');
  });

  it('should allow valid patient resource', () => {
    const builder = new ComprehensiveIPSCompositionBuilder();
    const patient: TPatient = {
      resourceType: 'Patient',
      id: 'p1',
      name: [{ family: 'Doe', given: ['John'] }],
      gender: 'male',
      birthDate: '1980-01-01',
      identifier: []
    };
    expect(() => builder.setPatient(patient)).not.toThrow();
  });
});

