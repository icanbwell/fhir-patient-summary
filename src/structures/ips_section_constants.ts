// Constants for IPS Sections

const VITAL_SIGNS_SUMMARY_COMPONENT_MAP = {
  "Systolic Blood Pressure": 'valueRatio.numerator.value',
  "Diastolic Blood Pressure": 'valueRatio.denominator.value',
  "Default": 'valueString'
};

const RESULT_SUMMARY_OBSERVATION_CATEGORIES = ["laboratory","Lab","LAB"]
const RESULT_SUMMARY_OBSERVATION_DATE_FILTER = 2 * 365 * 24 * 60 * 60 * 1000; // 2 years in milliseconds

const IPS_SUMMARY_COMPOSITION_TYPE_SYSTEM = "https://fhir.icanbwell.com/4_0_0/CodeSystem/composition/";

export { 
    VITAL_SIGNS_SUMMARY_COMPONENT_MAP,
    IPS_SUMMARY_COMPOSITION_TYPE_SYSTEM,
    RESULT_SUMMARY_OBSERVATION_CATEGORIES,
    RESULT_SUMMARY_OBSERVATION_DATE_FILTER
};
