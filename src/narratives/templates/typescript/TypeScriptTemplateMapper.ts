// TypeScriptTemplateMapper.ts - TypeScript replacement for IPSTemplateMapper.ts
import { IPSSections } from '../../../structures/ips_sections';
import { PatientTemplate } from './PatientTemplate';
import { AllergyIntoleranceTemplate } from './AllergyIntoleranceTemplate';
import { MedicationSummaryTemplate } from './MedicationSummaryTemplate';
import { ImmunizationsTemplate } from './ImmunizationsTemplate';
import { ProblemListTemplate } from './ProblemListTemplate';
import { VitalSignsTemplate } from './VitalSignsTemplate';
import { MedicalDevicesTemplate } from './MedicalDevicesTemplate';
import { DiagnosticResultsTemplate } from './DiagnosticResultsTemplate';
import { HistoryOfProceduresTemplate } from './HistoryOfProceduresTemplate';
import { SocialHistoryTemplate } from './SocialHistoryTemplate';
import { PastHistoryOfIllnessTemplate } from './PastHistoryOfIllnessTemplate';
import { PlanOfCareTemplate } from './PlanOfCareTemplate';
import { FunctionalStatusTemplate } from './FunctionalStatusTemplate';
import { PregnancyTemplate } from './PregnancyTemplate';
import { AdvanceDirectivesTemplate } from './AdvanceDirectivesTemplate';
import { CompositionTemplate } from './CompositionTemplate';
import { TBundle } from '../../../types/resources/Bundle';

/**
 * Interface for all template classes
 */
interface ITemplate {
  generateNarrative(resource: TBundle): string;
}

/**
 * Maps IPS sections to their corresponding TypeScript template classes
 * Replaces the Jinja2 template mapping system
 */
export class TypeScriptTemplateMapper {
  private static sectionToTemplate: Partial<Record<IPSSections, { new(): ITemplate } | { generateNarrative(resource: TBundle): string }>> = {
    [IPSSections.PATIENT]: PatientTemplate,
    [IPSSections.ALLERGIES]: AllergyIntoleranceTemplate,
    [IPSSections.MEDICATIONS]: MedicationSummaryTemplate,
    [IPSSections.IMMUNIZATIONS]: ImmunizationsTemplate,
    [IPSSections.PROBLEMS]: ProblemListTemplate,
    [IPSSections.VITAL_SIGNS]: VitalSignsTemplate,
    [IPSSections.MEDICAL_DEVICES]: MedicalDevicesTemplate,
    [IPSSections.LABORATORY_RESULTS]: DiagnosticResultsTemplate,
    [IPSSections.DIAGNOSTIC_REPORTS]: DiagnosticResultsTemplate,
    [IPSSections.PROCEDURES]: HistoryOfProceduresTemplate,
    [IPSSections.FAMILY_HISTORY]: PastHistoryOfIllnessTemplate,
    [IPSSections.SOCIAL_HISTORY]: SocialHistoryTemplate,
    [IPSSections.PREGNANCY_HISTORY]: PregnancyTemplate,
    [IPSSections.FUNCTIONAL_STATUS]: FunctionalStatusTemplate,
    [IPSSections.MEDICAL_HISTORY]: PastHistoryOfIllnessTemplate,
    [IPSSections.CARE_PLAN]: PlanOfCareTemplate,
    [IPSSections.CLINICAL_IMPRESSION]: CompositionTemplate,
    [IPSSections.ADVANCE_DIRECTIVES]: AdvanceDirectivesTemplate
  };

  /**
   * Generates HTML narrative for a specific IPS section
   * @param section - The IPS section
   * @param resource - FHIR Bundle containing resources
   * @returns HTML string for rendering
   */
  static generateNarrative(section: IPSSections, resource: TBundle): string {
    const templateClass = this.sectionToTemplate[section];

    if (!templateClass) {
      throw new Error(`No template found for section: ${section}`);
    }

    // Handle both static class and instantiable class
    if ('generateNarrative' in templateClass) {
      return templateClass.generateNarrative(resource);
    } else {
      const template = new templateClass();
      return template.generateNarrative(resource);
    }
  }
}
