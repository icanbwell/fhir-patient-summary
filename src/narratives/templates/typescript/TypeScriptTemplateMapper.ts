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
import { ITemplate } from './interfaces/ITemplate';
import { TDomainResource } from '../../../types/resources/DomainResource';

/**
 * Maps IPS sections to their corresponding TypeScript template classes
 * Replaces the Jinja2 template mapping system
 */
export class TypeScriptTemplateMapper {
  // Map of section types to their template classes
  // Each template either needs to be instantiated or has a static generateNarrative method
  private static sectionToTemplate: Record<IPSSections, ITemplate> = {
    [IPSSections.PATIENT]: new PatientTemplate(),
    [IPSSections.ALLERGIES]: new AllergyIntoleranceTemplate(),
    [IPSSections.MEDICATIONS]: new MedicationSummaryTemplate(),
    [IPSSections.IMMUNIZATIONS]: new ImmunizationsTemplate(),
    [IPSSections.PROBLEMS]: new ProblemListTemplate(),
    [IPSSections.VITAL_SIGNS]: new VitalSignsTemplate(),
    [IPSSections.MEDICAL_DEVICES]: new MedicalDevicesTemplate(),
    [IPSSections.DIAGNOSTIC_REPORTS]: new DiagnosticResultsTemplate(),
    [IPSSections.PROCEDURES]: new HistoryOfProceduresTemplate(),
    [IPSSections.SOCIAL_HISTORY]: new SocialHistoryTemplate(),
    [IPSSections.PREGNANCY_HISTORY]: new PregnancyTemplate(),
    [IPSSections.FUNCTIONAL_STATUS]: new FunctionalStatusTemplate(),
    [IPSSections.MEDICAL_HISTORY]: new PastHistoryOfIllnessTemplate(),
    [IPSSections.CARE_PLAN]: new PlanOfCareTemplate(),
    [IPSSections.ADVANCE_DIRECTIVES]: new AdvanceDirectivesTemplate()
  };

  /**
   * Generates HTML narrative for a specific IPS section
   * @param section - The IPS section
   * @param resources - FHIR resources
   * @param timezone - Optional timezone to use for date formatting (e.g., 'America/New_York', 'Europe/London')
   * @returns HTML string for rendering
   */
  static generateNarrative(section: IPSSections, resources: TDomainResource[], timezone: string | undefined): string {
    const templateClass: ITemplate = this.sectionToTemplate[section];

    if (!templateClass) {
      throw new Error(`No template found for section: ${section}`);
    }

    return templateClass.generateNarrative(resources, timezone);
  }
}
