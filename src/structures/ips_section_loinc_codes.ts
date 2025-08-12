// LOINC Codes for IPS Sections
import { IPSSections } from './ips_sections';

/*
 * LOINC codes for each IPS section. https://hl7.org/fhir/R4/valueset-doc-section-codes.html
 */
const IPS_SECTION_LOINC_CODES: Record<IPSSections, string> = {
  [IPSSections.PATIENT]: '54126-4',
  [IPSSections.ALLERGIES]: '48765-2',
  [IPSSections.MEDICATIONS]: '10160-0',
  [IPSSections.PROBLEMS]: '11450-4',
  [IPSSections.IMMUNIZATIONS]: '11369-6',
  [IPSSections.VITAL_SIGNS]: '8716-3',
  [IPSSections.MEDICAL_DEVICES]: '46264-8',
  [IPSSections.DIAGNOSTIC_REPORTS]: '30954-2',
  [IPSSections.PROCEDURES]: '47519-4',
  [IPSSections.FAMILY_HISTORY]: '10157-6',
  [IPSSections.SOCIAL_HISTORY]: '29762-2',
  [IPSSections.PREGNANCY_HISTORY]: '10162-6',
  [IPSSections.FUNCTIONAL_STATUS]: '47420-5',
  [IPSSections.MEDICAL_HISTORY]: '11348-0',
  [IPSSections.CARE_PLAN]: '18776-5',
  [IPSSections.ADVANCE_DIRECTIVES]: '42348-3',
};

const IPS_SECTION_DISPLAY_NAMES: Record<IPSSections, string> = {
  [IPSSections.PATIENT]: 'Patient summary Document',
  [IPSSections.ALLERGIES]: 'Allergies and Intolerances',
  [IPSSections.MEDICATIONS]: 'Medication Summary',
  [IPSSections.PROBLEMS]: 'Problem List',
  [IPSSections.IMMUNIZATIONS]: 'Immunizations',
  [IPSSections.DIAGNOSTIC_REPORTS]: 'Results Summary',
  [IPSSections.PROCEDURES]: 'History of Procedures',
  [IPSSections.MEDICAL_DEVICES]: 'History of Medical Devices',

  [IPSSections.VITAL_SIGNS]: 'Vital Signs',
  [IPSSections.ADVANCE_DIRECTIVES]: 'Advance Directives',
  [IPSSections.FUNCTIONAL_STATUS]: 'Functional Status',
  [IPSSections.PREGNANCY_HISTORY]: 'History of Pregnancies',
  [IPSSections.CARE_PLAN]: 'Plan of Care',
  [IPSSections.MEDICAL_HISTORY]: 'History of Past Illness',
  [IPSSections.SOCIAL_HISTORY]: 'Social History',

  [IPSSections.FAMILY_HISTORY]: 'History of Family Member Diseases',
};

const PREGNANCY_LONIC_CODES = {
  PREGNANCY_STATUS: {
    'LA15173-0': 'Pregnant',
    'LA26683-5': 'Not pregnant',
    'LA4489-6': 'Unknown',
  },
  PREGNANCY_OUTCOME: {
    '11636-8': 'Live Birth',
    '11637-6': 'Preterm Birth',
    '11638-4': 'Still Living Birth',
    '11639-2': 'Term Birth',
    '11640-0': 'Total Births',
    '11612-9': 'Abortions',
    '11613-7': 'Induced Abortions',
    '11614-5': 'Spontaneous Abortions',
    '33065-4': 'Ectopic Pregnancy',
  },
};

const SOCIAL_HISTORY_LONIC_CODES = {
  '72166-2': 'Tobacco Use',
  '74013-4': 'Alcohol Use',
};

export {
  IPS_SECTION_LOINC_CODES,
  IPS_SECTION_DISPLAY_NAMES,
  PREGNANCY_LONIC_CODES,
  SOCIAL_HISTORY_LONIC_CODES,
};
