// codingSystemDisplayNames.ts
// Mapping of common system URLs to friendly display names for coding systems

const CODING_SYSTEM_DISPLAY_NAMES: Record<string, string> = {
  'http://snomed.info/sct': 'SNOMED CT',
  'http://loinc.org': 'LOINC',
  'http://hl7.org/fhir/sid/icd-10': 'ICD-10',
  'http://hl7.org/fhir/sid/icd-9': 'ICD-9',
  'http://hl7.org/fhir/sid/cvx': 'CVX',
  'http://www.nlm.nih.gov/research/umls/rxnorm': 'RxNorm',
  'http://www.ama-assn.org/go/cpt': 'CPT',
  'http://unitsofmeasure.org': 'UCUM',
  // Add more as needed
};

export default CODING_SYSTEM_DISPLAY_NAMES;

