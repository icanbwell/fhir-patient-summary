// ITemplate.ts - Interface for template classes
import { TBundle } from '../../../../types/resources/Bundle';

/**
 * Interface for all template classes
 */
export interface ITemplate {
  /**
   * Generate HTML narrative for FHIR resources
   * @param resource - FHIR Bundle containing resources
   * @param timezone - Optional timezone to use for date formatting (e.g., 'America/New_York', 'Europe/London')
   * @returns HTML string for rendering
   */
  generateNarrative(resource: TBundle, timezone?: string): string;
}
