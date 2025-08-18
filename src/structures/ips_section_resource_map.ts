import { PREGNANCY_LOINC_CODES, SOCIAL_HISTORY_LOINC_CODES } from "./ips_section_loinc_codes";
import { IPSSections } from "./ips_sections";

// Mapping of IPSSections to FHIR resource types
export const IPSSectionResourceMap: Record<IPSSections, string[]> = {
    [IPSSections.PATIENT]: ['Patient'],
    [IPSSections.ALLERGIES]: ['AllergyIntolerance'],
    [IPSSections.MEDICATIONS]: ['MedicationRequest', 'MedicationStatement', 'Medication'], // Medication resource is needed for identifying name of medication
    [IPSSections.PROBLEMS]: ['Condition'],
    [IPSSections.IMMUNIZATIONS]: ['Immunization', 'Organization'], // Immunization can include Organization as a related resource
    [IPSSections.VITAL_SIGNS]: ['Observation'],
    [IPSSections.MEDICAL_DEVICES]: ['DeviceUseStatement', 'Device'], // Device resource is used for medical devices name
    [IPSSections.DIAGNOSTIC_REPORTS]: ['DiagnosticReport', 'Observation'],
    [IPSSections.PROCEDURES]: ['Procedure'],
    [IPSSections.SOCIAL_HISTORY]: ['Observation'],
    [IPSSections.PREGNANCY_HISTORY]: ['Observation'],
    [IPSSections.FUNCTIONAL_STATUS]: ['Condition', 'ClinicalImpression'],
    [IPSSections.MEDICAL_HISTORY]: ['Condition'],
    [IPSSections.CARE_PLAN]: ['CarePlan'],
    [IPSSections.ADVANCE_DIRECTIVES]: ['Consent']
};

// Optionally, define custom filter functions for each section
export type IPSSectionResourceFilter = (resource: any) => boolean;

export const IPSSectionResourceFilters: Partial<Record<IPSSections, IPSSectionResourceFilter>> = {
    // Only include active conditions
    [IPSSections.PROBLEMS]: (resource) => resource.resourceType === 'Condition'  && resource.clinicalStatus?.coding?.some((c: any) => !['inactive', 'resolved'].includes(c.code)),
    // Only include completed immunizations
    [IPSSections.IMMUNIZATIONS]: (resource) => (resource.resourceType === 'Immunization' && resource.status === 'completed') || (resource.resourceType === 'Organization'),
    // Only include vital sign Observations (category.coding contains 'vital-signs')
    [IPSSections.VITAL_SIGNS]: (resource) => resource.resourceType === 'Observation' && resource.category?.some((cat: any) => cat.coding?.some((c: any) => c.code === 'vital-signs')),
    // Only include finalized diagnostic reports
    [IPSSections.DIAGNOSTIC_REPORTS]: (resource) => ["DiagnosticReport", "Observation"].includes(resource.resourceType) && resource.status === 'final',
    // Only include completed procedures
    [IPSSections.PROCEDURES]: (resource) => resource.resourceType === 'Procedure' && resource.status === 'completed',
    // Only include social history Observations
    [IPSSections.SOCIAL_HISTORY]: (resource) => resource.resourceType === 'Observation' && resource.code?.coding?.some((c: any) => Object.keys(SOCIAL_HISTORY_LOINC_CODES).includes(c.code)),
    // Only include pregnancy history Observations
    [IPSSections.PREGNANCY_HISTORY]: (resource) => resource.resourceType === 'Observation' && (resource.code?.coding?.some((c: any) => Object.keys(PREGNANCY_LOINC_CODES.PREGNANCY_STATUS).includes(c.code)) || resource.valueCodeableConcept?.coding?.some((c: any) => Object.keys(PREGNANCY_LOINC_CODES.PREGNANCY_OUTCOME).includes(c.code))),
    // Only include Conditions or completed ClinicalImpressions
    [IPSSections.FUNCTIONAL_STATUS]: (resource) => (resource.resourceType === 'Condition') || (resource.resourceType === 'ClinicalImpression' && resource.status === 'completed'),
    // Only include resolved medical history Conditions
    [IPSSections.MEDICAL_HISTORY]: (resource) => resource.resourceType === 'Condition' && resource.clinicalStatus?.coding?.some((c: any) => ['inactive', 'resolved'].includes(c.code)),
    // Only include active care plans
    [IPSSections.CARE_PLAN]: (resource) => resource.resourceType === 'CarePlan' && resource.status === 'active',
    // Only include active advance directives (Consent resources)
    [IPSSections.ADVANCE_DIRECTIVES]: (resource) => resource.resourceType === 'Consent' && resource.status === 'active',
    // Patient section: only Patient resource
    [IPSSections.PATIENT]: (resource) => resource.resourceType === 'Patient',
};

// Helper class to get resource types for a section
export class IPSSectionResourceHelper {
    static getResourceTypesForSection(section: IPSSections): string[] {
        return IPSSectionResourceMap[section] || [];
    }
    static getResourceFilterForSection(section: IPSSections): IPSSectionResourceFilter | undefined {
        return IPSSectionResourceFilters[section];
    }
}
