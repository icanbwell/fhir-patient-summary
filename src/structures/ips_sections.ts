// Enum for all possible IPS sections
export enum IPSSections {
  PATIENT = 'Patient',

  // Mandatory Sections
  PROBLEMS = 'ProblemSection',
  ALLERGIES = 'AllergyIntoleranceSection',
  MEDICATIONS = 'MedicationSummarySection',

  // Additional Recommended Sections
  IMMUNIZATIONS = 'ImmunizationSection',
  DIAGNOSTIC_REPORTS = 'ResultsSection',
  PROCEDURES = 'HistoryOfProceduresSection',
  MEDICAL_DEVICES = 'MedicalDeviceSection',

  // Optional Sections
  ADVANCE_DIRECTIVES = 'AdvanceDirectivesSection',
  FUNCTIONAL_STATUS = 'FunctionalStatusSection',
  PREGNANCY_HISTORY = 'HistoryOfPregnancySection',
  CARE_PLAN = 'PlanOfCareSection',
  MEDICAL_HISTORY = 'HistoryOfPastIllnessSection',
  SOCIAL_HISTORY = 'SocialHistorySection',
  VITAL_SIGNS = 'VitalSignsSection',
  // Measurements captured by a patient's connected devices (smart watches,
  // scales, sleep trackers). Distinct from MEDICAL_DEVICES, which lists the
  // Device/DeviceUseStatement equipment records rather than their readings.
  DEVICE_METRICS = 'DeviceMetricsSection',
  WEARABLES = 'WearableDeviceDataSection',

  // missing IPS Sections
  // ALERTS = 'AlertsSection',
  // PATIENT_STORY = 'PatientStorySection',
}
