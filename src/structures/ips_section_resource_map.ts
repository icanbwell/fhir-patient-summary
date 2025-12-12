import { IPS_SUMMARY_COMPOSITION_TYPE_SYSTEM, RESULT_SUMMARY_OBSERVATION_CATEGORIES } from "./ips_section_constants";
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
    [IPSSections.MEDICATIONS]: (resource) => (['MedicationRequest', 'MedicationStatement'].includes(resource.resourceType) && resource.status === 'active') || resource.resourceType === 'Medication',
    // Only include active conditions
    [IPSSections.PROBLEMS]: (resource) => resource.resourceType === 'Condition'  && resource.clinicalStatus?.coding?.some((c: any) => !['inactive', 'resolved'].includes(c.code)),
    // Only include completed immunizations
    [IPSSections.IMMUNIZATIONS]: (resource) => (resource.resourceType === 'Immunization' && resource.status === 'completed') || (resource.resourceType === 'Organization'),
    // Only include vital sign Observations (category.coding contains 'vital-signs')
    [IPSSections.VITAL_SIGNS]: (resource) => resource.resourceType === 'Observation' && resource.category?.some((cat: any) => cat.coding?.some((c: any) => c.code === 'vital-signs')),
    // Includes DeviceUseStatement. Device is needed for linked device details
    [IPSSections.MEDICAL_DEVICES]: (resource) => ['DeviceUseStatement', 'Device'].includes(resource.resourceType),
    // Only include finalized diagnostic reports
    [IPSSections.DIAGNOSTIC_REPORTS]: (resource) => resource.resourceType === "Observation" && resource.category?.some((cat: any) => cat.coding?.some((c: any) => RESULT_SUMMARY_OBSERVATION_CATEGORIES.includes(c.code))),
    // Only include completed procedures
    [IPSSections.PROCEDURES]: (resource) => resource.resourceType === 'Procedure' && resource.status === 'completed',
    // Only include social history Observations
    [IPSSections.SOCIAL_HISTORY]: (resource) => resource.resourceType === 'Observation' && resource.code?.coding?.some((c: any) => Object.keys(SOCIAL_HISTORY_LOINC_CODES).includes(c.code)),
    // Only include pregnancy history Observations
    [IPSSections.PREGNANCY_HISTORY]: (resource) => resource.resourceType === 'Observation' && (resource.code?.coding?.some((c: any) => Object.keys(PREGNANCY_LOINC_CODES.PREGNANCY_STATUS).includes(c.code)) || resource.valueCodeableConcept?.coding?.some((c: any) => Object.keys(PREGNANCY_LOINC_CODES.PREGNANCY_OUTCOME).includes(c.code))),
    // Only include Conditions or completed ClinicalImpressions
    [IPSSections.FUNCTIONAL_STATUS]: (resource) => (resource.resourceType === 'Condition'  && resource.clinicalStatus?.coding?.some((c: any) => !['inactive', 'resolved'].includes(c.code))) || (resource.resourceType === 'ClinicalImpression' && resource.status === 'completed'),
    // Only include resolved medical history Conditions
    [IPSSections.MEDICAL_HISTORY]: (resource) => resource.resourceType === 'Condition' && resource.clinicalStatus?.coding?.some((c: any) => ['inactive', 'resolved'].includes(c.code)),
    // Only include active care plans
    [IPSSections.CARE_PLAN]: (resource) => resource.resourceType === 'CarePlan' && resource.status === 'active',
    // Only include active advance directives (Consent resources)
    [IPSSections.ADVANCE_DIRECTIVES]: (resource) => resource.resourceType === 'Consent' && resource.status === 'active',
};

export const IPSSectionSummaryCompositionFilter: Partial<Record<IPSSections, IPSSectionResourceFilter>> = {
    [IPSSections.ALLERGIES]: (resource) => resource.resourceType === 'Composition' && resource.type?.coding?.some((c: any) => c.system === IPS_SUMMARY_COMPOSITION_TYPE_SYSTEM && c.code === "allergy_summary_document"),
    [IPSSections.VITAL_SIGNS]: (resource) => resource.resourceType === 'Composition' && resource.type?.coding?.some((c: any) => c.system === IPS_SUMMARY_COMPOSITION_TYPE_SYSTEM && c.code === "vital_summary_document"),
    [IPSSections.CARE_PLAN]: (resource) => resource.resourceType === 'Composition' && resource.type?.coding?.some((c: any) => c.system === IPS_SUMMARY_COMPOSITION_TYPE_SYSTEM && c.code === "careplan_summary_document"),
    [IPSSections.IMMUNIZATIONS]: (resource) => resource.resourceType === 'Composition' && resource.type?.coding?.some((c: any) => c.system === IPS_SUMMARY_COMPOSITION_TYPE_SYSTEM && c.code === "immunization_summary_document"),
    [IPSSections.MEDICATIONS]: (resource) => resource.resourceType === 'Composition' && resource.type?.coding?.some((c: any) => c.system === IPS_SUMMARY_COMPOSITION_TYPE_SYSTEM && c.code === "medication_summary_document"),
    // [IPSSections.DIAGNOSTIC_REPORTS]: (resource) => resource.resourceType === 'Composition' && resource.type?.coding?.some((c: any) => c.system === IPS_SUMMARY_COMPOSITION_TYPE_SYSTEM && ["lab_summary_document", "diagnosticreportlab_summary_document"].includes(c.code)),
    [IPSSections.PROCEDURES]: (resource) => resource.resourceType === 'Composition' && resource.type?.coding?.some((c: any) => c.system === IPS_SUMMARY_COMPOSITION_TYPE_SYSTEM && c.code === "procedure_summary_document"),
}

export const IPSSectionSummaryIPSCompositionFilter: Partial<Record<IPSSections, IPSSectionResourceFilter>> = {
    [IPSSections.VITAL_SIGNS]: (resource) => resource.resourceType === 'Composition' && resource.type?.coding?.some((c: any) => c.system === IPS_SUMMARY_COMPOSITION_TYPE_SYSTEM && c.code === "ips_vital_summary_document"),
}

// Helper class to get resource types for a section
export class IPSSectionResourceHelper {
    static getResourceFilterForSection(section: IPSSections): IPSSectionResourceFilter {
        return IPSSectionResourceFilters[section] as IPSSectionResourceFilter;
    }

    static getSectionResources(section: IPSSections, resources: any[]): any[] {
        const filter = IPSSectionResourceFilters[section];
        if (!filter) return [];
        return resources.filter(filter);
    }

    static getSummaryCompositionFilterForSection(section: IPSSections): IPSSectionResourceFilter | undefined {
        return IPSSectionSummaryCompositionFilter[section];
    }

    static getSummaryIPSCompositionFilterForSection(section: IPSSections): IPSSectionResourceFilter | undefined {
        return IPSSectionSummaryIPSCompositionFilter[section];
    }
}
