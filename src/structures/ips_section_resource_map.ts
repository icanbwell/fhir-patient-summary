import { IPSSections } from "./ips_sections";

// Mapping of IPSSections to FHIR resource types
export const IPSSectionResourceMap: Record<IPSSections, string[]> = {
    [IPSSections.PATIENT]: ['Patient'],
    [IPSSections.ALLERGIES]: ['AllergyIntolerance'],
    [IPSSections.MEDICATIONS]: ['MedicationRequest', 'MedicationStatement'],
    [IPSSections.PROBLEMS]: ['Condition'],
    [IPSSections.IMMUNIZATIONS]: ['Immunization'],
    [IPSSections.VITAL_SIGNS]: ['Observation'],
    [IPSSections.MEDICAL_DEVICES]: ['Device'],
    [IPSSections.LABORATORY_RESULTS]: ['Observation'],
    [IPSSections.DIAGNOSTIC_REPORTS]: ['DiagnosticReport'],
    [IPSSections.PROCEDURES]: ['Procedure'],
    [IPSSections.FAMILY_HISTORY]: ['FamilyMemberHistory'],
    [IPSSections.SOCIAL_HISTORY]: ['Observation'], // Social history is often Observation
    [IPSSections.PREGNANCY_HISTORY]: ['Observation'], // Pregnancy history is often Observation
    [IPSSections.FUNCTIONAL_STATUS]: ['Observation'], // Functional status is often Observation
    [IPSSections.MEDICAL_HISTORY]: ['Condition'], // Medical history is often Condition
    [IPSSections.CARE_PLAN]: ['CarePlan'],
    [IPSSections.CLINICAL_IMPRESSION]: ['ClinicalImpression']
};

// Optionally, define custom filter functions for each section
export type IPSSectionResourceFilter = (resource: any) => boolean;

export const IPSSectionResourceFilters: Partial<Record<IPSSections, IPSSectionResourceFilter>> = {
    // Only include active allergies
    [IPSSections.ALLERGIES]: (resource) => resource.resourceType === 'AllergyIntolerance' && resource.clinicalStatus?.coding?.some((c: any) => c.code === 'active'),
    // Only include active medication requests/statements
    [IPSSections.MEDICATIONS]: (resource) =>
        (resource.resourceType === 'MedicationRequest' && resource.status === 'active') ||
        (resource.resourceType === 'MedicationStatement' && resource.status === 'active'),
    // Only include active problems/conditions
    [IPSSections.PROBLEMS]: (resource) => resource.resourceType === 'Condition' && resource.clinicalStatus?.coding?.some((c: any) => c.code === 'active'),
    // Only include completed immunizations
    [IPSSections.IMMUNIZATIONS]: (resource) => resource.resourceType === 'Immunization' && resource.status === 'completed',
    // Only include vital sign Observations (category.coding contains 'vital-signs')
    [IPSSections.VITAL_SIGNS]: (resource) => resource.resourceType === 'Observation' && resource.category?.some((cat: any) => cat.coding?.some((c: any) => c.code === 'vital-signs')),
    // Only include active devices
    [IPSSections.MEDICAL_DEVICES]: (resource) => resource.resourceType === 'Device' && resource.status === 'active',
    // Only include lab Observations (category.coding contains 'laboratory')
    [IPSSections.LABORATORY_RESULTS]: (resource) => resource.resourceType === 'Observation' && resource.category?.some((cat: any) => cat.coding?.some((c: any) => c.code === 'laboratory')),
    // Only include finalized diagnostic reports
    [IPSSections.DIAGNOSTIC_REPORTS]: (resource) => resource.resourceType === 'DiagnosticReport' && resource.status === 'final',
    // Only include completed procedures
    [IPSSections.PROCEDURES]: (resource) => resource.resourceType === 'Procedure' && resource.status === 'completed',
    // Only include family history resources
    [IPSSections.FAMILY_HISTORY]: (resource) => resource.resourceType === 'FamilyMemberHistory',
    // Only include social history Observations (category.coding contains 'social-history')
    [IPSSections.SOCIAL_HISTORY]: (resource) => resource.resourceType === 'Observation' && resource.category?.some((cat: any) => cat.coding?.some((c: any) => c.code === 'social-history')),
    // Only include pregnancy history Observations (category.coding contains 'pregnancy')
    [IPSSections.PREGNANCY_HISTORY]: (resource) => resource.resourceType === 'Observation' && resource.category?.some((cat: any) => cat.coding?.some((c: any) => c.code === 'pregnancy')),
    // Only include functional status Observations (category.coding contains 'functional-status')
    [IPSSections.FUNCTIONAL_STATUS]: (resource) => resource.resourceType === 'Observation' && resource.category?.some((cat: any) => cat.coding?.some((c: any) => c.code === 'functional-status')),
    // Only include active medical history Conditions
    [IPSSections.MEDICAL_HISTORY]: (resource) => resource.resourceType === 'Condition' && resource.clinicalStatus?.coding?.some((c: any) => c.code === 'active'),
    // Only include active care plans
    [IPSSections.CARE_PLAN]: (resource) => resource.resourceType === 'CarePlan' && resource.status === 'active',
    // Only include ClinicalImpression resources
    [IPSSections.CLINICAL_IMPRESSION]: (resource) => resource.resourceType === 'ClinicalImpression',
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
