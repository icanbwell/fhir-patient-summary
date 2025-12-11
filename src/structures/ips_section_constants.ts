// Constants for IPS Sections

const VITAL_SIGNS_SUMMARY_COMPONENT_MAP = {
  "Systolic Blood Pressure": 'valueRatio.numerator.value',
  "Diastolic Blood Pressure": 'valueRatio.denominator.value',
  "Default": 'valueString'
};

const RESULT_SUMMARY_OBSERVATION_CATEGORES = ["laboratory","Lab","LAB"]

const IPS_SUMMARY_COMPOSITION_TYPE_SYSTEM = "https://fhir.icanbwell.com/4_0_0/CodeSystem/composition/";

export { 
    VITAL_SIGNS_SUMMARY_COMPONENT_MAP,
    IPS_SUMMARY_COMPOSITION_TYPE_SYSTEM,
    RESULT_SUMMARY_OBSERVATION_CATEGORES
};
