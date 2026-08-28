// Constants for IPS Sections
import { IPSSections } from './ips_sections';

const VITAL_SIGNS_SUMMARY_COMPONENT_MAP = {
  'Systolic Blood Pressure': 'valueRatio.numerator.value',
  'Diastolic Blood Pressure': 'valueRatio.denominator.value',
  Default: 'valueString',
};

const RESULT_SUMMARY_OBSERVATION_CATEGORIES = ['laboratory', 'Lab', 'LAB'];
const RESULT_SUMMARY_OBSERVATION_DATE_FILTER = 2 * 365 * 24 * 60 * 60 * 1000; // 2 years in milliseconds

const IPS_SUMMARY_COMPOSITION_TYPE_SYSTEM =
  'https://fhir.icanbwell.com/4_0_0/CodeSystem/composition/type';
const IPS_SUMMARY_COMPOSITION_VIEW_TYPE_SYSTEM =
  'https://fhir.icanbwell.com/4_0_0/CodeSystem/composition/view-type';

/**
 * Per-section cap on how many resources each group within a summary
 * Composition contributes to the built section (a "group" being one of the
 * Composition's own sub-sections — e.g. one device metric).
 *
 * Only set for sections whose source Composition can reference thousands of
 * resources; a section absent from this map is built uncapped, preserving
 * existing behaviour. Device metrics need it because a continuously-sampling
 * wearable can report hundreds of readings per metric across dozens of
 * metrics, which would otherwise dominate the IPS bundle.
 */
const MAX_ENTRIES_PER_GROUP: Partial<Record<IPSSections, number>> = {
  [IPSSections.DEVICE_METRICS]: 10,
};

export {
  VITAL_SIGNS_SUMMARY_COMPONENT_MAP,
  IPS_SUMMARY_COMPOSITION_TYPE_SYSTEM,
  IPS_SUMMARY_COMPOSITION_VIEW_TYPE_SYSTEM,
  RESULT_SUMMARY_OBSERVATION_CATEGORIES,
  RESULT_SUMMARY_OBSERVATION_DATE_FILTER,
  MAX_ENTRIES_PER_GROUP,
};
