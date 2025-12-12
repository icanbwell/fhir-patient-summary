import { IPS_SUMMARY_COMPOSITION_TYPE_SYSTEM, RESULT_SUMMARY_OBSERVATION_CATEGORIES } from "./ips_section_constants";
import { PREGNANCY_LOINC_CODES, SOCIAL_HISTORY_LOINC_CODES, PREGNANCY_SNOMED_CODES } from "./ips_section_loinc_codes";
import { IPSSections } from "./ips_sections";
import {TCodeableConcept} from "../types/partials/CodeableConcept";
import {TCoding} from "../types/partials/Coding";

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
    [IPSSections.VITAL_SIGNS]: (resource) => resource.resourceType === 'Observation' && resource.category?.some((cat: any) => cat.coding?.some((c: any) => codingMatches(c, 'vital-signs', c.system))),
    // Includes DeviceUseStatement. Device is needed for linked device details
    [IPSSections.MEDICAL_DEVICES]: (resource) => ['DeviceUseStatement', 'Device'].includes(resource.resourceType),
    // Only include finalized diagnostic reports and relevant observations
    [IPSSections.DIAGNOSTIC_REPORTS]: (resource) =>
        (resource.resourceType === 'DiagnosticReport' && resource.status === 'final') ||
        (resource.resourceType === 'Observation' && resource.category?.some((cat: any) => cat.coding?.some((c: any) => codingMatches(c, RESULT_SUMMARY_OBSERVATION_CATEGORIES, c.system)))),
    // Only include completed procedures
    [IPSSections.PROCEDURES]: (resource) => resource.resourceType === 'Procedure' && resource.status === 'completed',
    // Only include social history Observations
    [IPSSections.SOCIAL_HISTORY]: (resource) => resource.resourceType === 'Observation' && codeableConceptMatches(resource.code, Object.keys(SOCIAL_HISTORY_LOINC_CODES), 'http://loinc.org'),
    // Only include pregnancy history Observations or relevant Conditions
    [IPSSections.PREGNANCY_HISTORY]: (resource) => (
        resource.resourceType === 'Observation' && (
            codeableConceptMatches(resource.code, Object.keys(PREGNANCY_LOINC_CODES.PREGNANCY_STATUS), 'http://loinc.org') ||
            codeableConceptMatches(resource.valueCodeableConcept, Object.keys(PREGNANCY_LOINC_CODES.PREGNANCY_OUTCOME), 'http://loinc.org') ||
            codingMatches(resource.code?.coding?.[0], PREGNANCY_SNOMED_CODES, 'http://snomed.info/sct') ||
            codingMatches(resource.valueCodeableConcept?.coding?.[0], PREGNANCY_SNOMED_CODES, 'http://snomed.info/sct')
        )
    ) || (
        resource.resourceType === 'Condition' && (
            codeableConceptMatches(resource.code, Object.keys(PREGNANCY_LOINC_CODES.PREGNANCY_STATUS), 'http://loinc.org') ||
            codeableConceptMatches(resource.code, Object.keys(PREGNANCY_LOINC_CODES.PREGNANCY_OUTCOME), 'http://loinc.org') ||
            codingMatches(resource.code?.coding?.[0], PREGNANCY_SNOMED_CODES, 'http://snomed.info/sct')
        )
    ),
    // Only include Observations with LOINC 47420-5, category 'functional-status', or category display containing 'functional', and completed ClinicalImpressions
    [IPSSections.FUNCTIONAL_STATUS]: (resource) => (
        resource.resourceType === 'Observation' && (
            codeableConceptMatches(resource.code, '47420-5', 'http://loinc.org') ||
            resource.category?.some((cat: any) =>
                cat.coding?.some((c: any) =>
                    (c.code === 'functional-status' && c.system === 'http://terminology.hl7.org/CodeSystem/observation-category') ||
                    (typeof c.display === 'string' && c.display.toLowerCase().includes('functional'))
                )
            )
        )
    ) || (resource.resourceType === 'ClinicalImpression' && resource.status === 'completed'),
    // Only include resolved medical history Conditions
    [IPSSections.MEDICAL_HISTORY]: (resource) => resource.resourceType === 'Condition' && resource.clinicalStatus?.coding?.some((c: any) => ['inactive', 'resolved'].includes(c.code)),
    // Only include active care plans
    [IPSSections.CARE_PLAN]: (resource) => resource.resourceType === 'CarePlan' && resource.status === 'active',
    // Only include active advance directives (Consent resources)
    [IPSSections.ADVANCE_DIRECTIVES]: (resource) => resource.resourceType === 'Consent' && resource.status === 'active',
};

export const IPSSectionSummaryCompositionFilter: Partial<Record<IPSSections, IPSSectionResourceFilter>> = {
    [IPSSections.ALLERGIES]: (resource) => resource.resourceType === 'Composition' && resource.type?.coding?.some((c: any) => codingMatches(c, "allergy_summary_document", IPS_SUMMARY_COMPOSITION_TYPE_SYSTEM)),
    [IPSSections.VITAL_SIGNS]: (resource) => resource.resourceType === 'Composition' && resource.type?.coding?.some((c: any) => codingMatches(c, "vital_summary_document", IPS_SUMMARY_COMPOSITION_TYPE_SYSTEM)),
    [IPSSections.CARE_PLAN]: (resource) => resource.resourceType === 'Composition' && resource.type?.coding?.some((c: any) => codingMatches(c, "careplan_summary_document", IPS_SUMMARY_COMPOSITION_TYPE_SYSTEM)),
    [IPSSections.IMMUNIZATIONS]: (resource) => resource.resourceType === 'Composition' && resource.type?.coding?.some((c: any) => codingMatches(c, "immunization_summary_document", IPS_SUMMARY_COMPOSITION_TYPE_SYSTEM)),
    [IPSSections.MEDICATIONS]: (resource) => resource.resourceType === 'Composition' && resource.type?.coding?.some((c: any) => codingMatches(c, "medication_summary_document", IPS_SUMMARY_COMPOSITION_TYPE_SYSTEM)),
    // [IPSSections.DIAGNOSTIC_REPORTS]: (resource) => resource.resourceType === 'Composition' && resource.type?.coding?.some((c: any) => c.system === IPS_SUMMARY_COMPOSITION_TYPE_SYSTEM && ["lab_summary_document", "diagnosticreportlab_summary_document"].includes(c.code)),
    [IPSSections.PROCEDURES]: (resource) => resource.resourceType === 'Composition' && resource.type?.coding?.some((c: any) => codingMatches(c, "procedure_summary_document", IPS_SUMMARY_COMPOSITION_TYPE_SYSTEM)),
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
}

/**
 * Helper to match a coding object against a code (string or string[]) and system.
 * Returns true if coding.system matches system and coding.code matches code or is in codes.
 */
export function codingMatches(coding: TCoding, code: string | string[], system: string): boolean {
    if (!coding || !coding.system) return false;
    if (Array.isArray(code)) {
        return coding.system === system && code.includes(coding.code ?? '');
    }
    return coding.system === system && coding.code === code;
}

/**
 * Helper to match a CodeableConcept object against a code (string or string[]) and system.
 * Returns true if any coding in the CodeableConcept matches the code and system.
 */
export function codeableConceptMatches(codeableConcept: TCodeableConcept, code: string | string[], system: string): boolean {
    if (!codeableConcept || !Array.isArray(codeableConcept.coding)) return false;
    return codeableConcept.coding.some((coding: any) => codingMatches(coding, code, system));
}
