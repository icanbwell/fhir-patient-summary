// ITemplate.ts - Interface for template classes
import { TComposition } from '../../../../types/resources/Composition';
import { TDomainResource } from '../../../../types/resources/DomainResource';

/**
 * Interface for all template classes
 */
export interface ITemplate {
  /**
   * Generate HTML narrative for FHIR resources
   * @param resource - FHIR resources
   * @param timezone - Optional timezone to use for date formatting (e.g., 'America/New_York', 'Europe/London')
   * @param now - Optional current date to use for calculations (defaults to new Date())
   * @returns HTML string for rendering
   */
  generateNarrative(resource: TDomainResource[], timezone: string | undefined, now?: Date): string;
}

/**
 * Interface for all template classes
 */
export interface ISummaryTemplate extends ITemplate {
  /**
   * Generate HTML narrative for FHIR resources
   * @param resource - FHIR Composition resources containing section summary
   * @param timezone - Optional timezone to use for date formatting (e.g., 'America/New_York', 'Europe/London')
   * @param now - Optional current date to use for calculations (defaults to new Date())
   * @returns HTML string for rendering
   */
  generateSummaryNarrative(resource: TComposition[], timezone: string | undefined, now?: Date): string | undefined;
}
