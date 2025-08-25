import { PREGNANCY_LOINC_CODES, SOCIAL_HISTORY_LOINC_CODES } from "./ips_section_loinc_codes";
import { IPSSections } from "./ips_sections";

// Optionally, define custom filter functions for each section
export type IPSSectionResourceFilter = (resource: any) => boolean;

export const IPSSectionResourceFilters: Partial<Record<IPSSections, IPSSectionResourceFilter>> = {
    // Patient section: only Patient resource
    [IPSSections.PATIENT]: (resource) => resource.resourceType === 'Patient',
    // Only include allergies
    [IPSSections.ALLERGIES]: (resource) => resource.resourceType === 'AllergyIntolerance',
    // includes MedicationRequest, MedicationStatement. Medication is needed for medication names
    [IPSSections.MEDICATIONS]: (resource) => ['MedicationRequest', 'MedicationStatement', 'Medication'].includes(resource.resourceType),
    // Only include active conditions
    [IPSSections.PROBLEMS]: (resource) => resource.resourceType === 'Condition'  && resource.clinicalStatus?.coding?.some((c: any) => !['inactive', 'resolved'].includes(c.code)),
    // Only include completed immunizations
    [IPSSections.IMMUNIZATIONS]: (resource) => (resource.resourceType === 'Immunization' && resource.status === 'completed') || (resource.resourceType === 'Organization'),
    // Only include vital sign Observations (category.coding contains 'vital-signs')
    [IPSSections.VITAL_SIGNS]: (resource) => resource.resourceType === 'Observation' && resource.category?.some((cat: any) => cat.coding?.some((c: any) => c.code === 'vital-signs')),
    // Includes DeviceUseStatement. Device is needed for linked device details
    [IPSSections.MEDICAL_DEVICES]: (resource) => ['DeviceUseStatement', 'Device'].includes(resource.resourceType),
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
    
};

// Helper class to get resource types for a section
export class IPSSectionResourceHelper {
    static getResourceFilterForSection(section: IPSSections): IPSSectionResourceFilter {
        return IPSSectionResourceFilters[section] as IPSSectionResourceFilter;
    }
}
