// ITemplate.ts - Interface for template classes
import { TDomainResource } from '../../../../types/resources/DomainResource';

/**
 * Interface for all template classes
 */
export interface ITemplate {
  /**
   * Generate HTML narrative for FHIR resources
   * @param resource - FHIR resources
   * @param timezone - Optional timezone to use for date formatting (e.g., 'America/New_York', 'Europe/London')
   * @returns HTML string for rendering
   */
  generateNarrative(resource: TDomainResource[], timezone: string | undefined): string;
}
