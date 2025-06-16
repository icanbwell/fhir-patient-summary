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

// Helper class to get resource types for a section
export class IPSSectionResourceHelper {
    static getResourceTypesForSection(section: IPSSections): string[] {
        return IPSSectionResourceMap[section] || [];
    }
}
