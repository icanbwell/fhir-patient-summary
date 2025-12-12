// codingSystemDisplayNames.ts
// Mapping of common system URLs to friendly display names for coding systems

const CODING_SYSTEM_DISPLAY_NAMES: Record<string, string> = {
  'http://snomed.info/sct': 'SNOMED CT',
  'http://loinc.org': 'LOINC',
  'http://hl7.org/fhir/sid/icd-10': 'ICD-10',
  'http://hl7.org/fhir/sid/icd-10-cm': 'ICD-10-CM',
  'http://hl7.org/fhir/sid/icd-9': 'ICD-9',
  'http://hl7.org/fhir/sid/cvx': 'CVX',
  'http://www.nlm.nih.gov/research/umls/rxnorm': 'RxNorm',
  'http://www.ama-assn.org/go/cpt': 'CPT',
  'http://unitsofmeasure.org': 'UCUM',
  'http://e-imo.com/products/problem-it': 'IMO Problem IT',
  '2.16.840.1.113883.6.285': 'HCPCS Level II',
  'https://fhir.cerner.com/4ff3b259-e48d-4066-8b35-a6a051f2802a/codeSet/72': 'Cerner Code Set 72',
  'http://hl7.org/fhir/sid/ndc': 'NDC', // Added mapping for NDC
  'urn:oid:2.16.840.1.113883.12.292': 'CVX',
  'http://terminology.hl7.org/CodeSystem/data-absent-reason': 'Data Absent Reason', // Added mapping for Data Absent Reason
  '2.16.840.1.113883.6.208': 'NDDF',
  // Add more as needed
};

export default CODING_SYSTEM_DISPLAY_NAMES;
