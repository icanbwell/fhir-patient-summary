// LOINC Codes for IPS Sections
import {IPSSections} from "./ips_sections";

const IPS_SECTION_LOINC_CODES: Record<IPSSections, string> = {
    [IPSSections.PATIENT]: '54126-4',
    [IPSSections.ALLERGIES]: '48765-2',
    [IPSSections.MEDICATIONS]: '10160-0',
    [IPSSections.PROBLEMS]: '11450-4',
    [IPSSections.IMMUNIZATIONS]: '11369-6',
    [IPSSections.VITAL_SIGNS]: '8716-3',
    [IPSSections.MEDICAL_DEVICES]: '46264-8',
    [IPSSections.LABORATORY_RESULTS]: '30954-2',
    [IPSSections.DIAGNOSTIC_REPORTS]: '30954-2',
    [IPSSections.PROCEDURES]: '47519-4',
    [IPSSections.FAMILY_HISTORY]: '10157-6',
    [IPSSections.SOCIAL_HISTORY]: '29762-2',
    [IPSSections.PREGNANCY_HISTORY]: '10162-6',
    [IPSSections.FUNCTIONAL_STATUS]: '47420-5',
    [IPSSections.MEDICAL_HISTORY]: '11348-0',
    [IPSSections.CARE_PLAN]: '18776-5',
    [IPSSections.CLINICAL_IMPRESSION]: '51848-0'
};

const IPS_SECTION_DISPLAY_NAMES: Record<IPSSections, string> = {
    [IPSSections.PATIENT]: 'Patient summary Document',
    [IPSSections.ALLERGIES]: 'Allergies and adverse reactions Document',
    [IPSSections.MEDICATIONS]: 'History of Medication use Narrative',
    [IPSSections.PROBLEMS]: 'Problem list - Reported',
    [IPSSections.IMMUNIZATIONS]: 'History of Immunization Narrative',
    [IPSSections.VITAL_SIGNS]: 'Vital signs',
    [IPSSections.MEDICAL_DEVICES]: 'History of medical device use',
    [IPSSections.LABORATORY_RESULTS]: 'Relevant diagnostic tests/laboratory data Narrative',
    [IPSSections.DIAGNOSTIC_REPORTS]: 'Relevant diagnostic tests/laboratory data Narrative',
    [IPSSections.PROCEDURES]: 'History of Procedures Document',
    [IPSSections.FAMILY_HISTORY]: 'History of family member diseases Narrative',
    [IPSSections.SOCIAL_HISTORY]: 'Social history Narrative',
    [IPSSections.PREGNANCY_HISTORY]: 'History of pregnancies Narrative',
    [IPSSections.FUNCTIONAL_STATUS]: 'Functional status assessment note',
    [IPSSections.MEDICAL_HISTORY]: 'History of Past illness NarrativeHistory and physical note Document',
    [IPSSections.CARE_PLAN]: 'Plan of care note',
    [IPSSections.CLINICAL_IMPRESSION]: 'Evaluation note'
};

export {IPS_SECTION_LOINC_CODES, IPS_SECTION_DISPLAY_NAMES};