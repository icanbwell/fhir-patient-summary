// Constants for IPS Sections

const VITAL_SIGNS_SUMMARY_COMPONENT_MAP = {
  "Systolic Blood Pressure": 'valueRatio.numerator.value',
  "Diastolic Blood Pressure": 'valueRatio.denominator.value',
  "Default": 'valueString'
};

const RESULT_SUMMARY_OBSERVATION_CATEGORIES = ["laboratory","Lab","LAB"]
const RESULT_SUMMARY_OBSERVATION_DATE_FILTER = 2 * 365 * 24 * 60 * 60 * 1000; // 2 years in milliseconds

const IPS_SUMMARY_IPS_COMPOSITION_TYPE_SYSTEM = "https://fhir.icanbwell.com/4_0_0/CodeSystem/composition/"
const IPS_SUMMARY_COMPOSITION_TYPE_SYSTEM = "https://fhir.icanbwell.com/4_0_0/CodeSystem/composition/type"
const IPS_SUMMARY_COMPOSITION_VIEW_TYPE_SYSTEM = "https://fhir.icanbwell.com/4_0_0/CodeSystem/composition/view-type"
const V2_COMPOSITION_PIPELINE = "https://www.icanbwell.com/fhir-composition-service"
const V3_COMPOSITION_PIPELINE = "https://www.icanbwell.com/intelligence-layer-databricks"

export { 
    VITAL_SIGNS_SUMMARY_COMPONENT_MAP,
    IPS_SUMMARY_COMPOSITION_TYPE_SYSTEM,
    IPS_SUMMARY_COMPOSITION_VIEW_TYPE_SYSTEM,
    IPS_SUMMARY_IPS_COMPOSITION_TYPE_SYSTEM,
    RESULT_SUMMARY_OBSERVATION_CATEGORIES,
    RESULT_SUMMARY_OBSERVATION_DATE_FILTER,
    V2_COMPOSITION_PIPELINE,
    V3_COMPOSITION_PIPELINE
};
