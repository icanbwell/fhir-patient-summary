import { TBundle } from '../../../types/resources/Bundle';
import { ITemplate } from './interfaces/ITemplate';

/**
 * Class to generate HTML narrative for Composition resources
 * This replaces the Jinja2 composition.j2 template
 */
export class CompositionTemplate implements ITemplate {
  /**
   * Generate HTML narrative for Composition resources
   * @param resource - FHIR Bundle containing Composition resources
   * @param timezone - Optional timezone to use for date formatting (e.g., 'America/New_York', 'Europe/London')
   * @returns HTML string for rendering
   */
  generateNarrative(resource: TBundle, timezone?: string): string {
    return CompositionTemplate.generateStaticNarrative(resource, timezone);
  }

  /**
   * Static implementation of generateNarrative for use with TypeScriptTemplateMapper
   * @param resource - FHIR Bundle containing Composition resources
   * @param timezone - Optional timezone to use for date formatting (e.g., 'America/New_York', 'Europe/London')
   * @returns HTML string for rendering
   */
  static generateNarrative(resource: TBundle, timezone?: string): string {
    return CompositionTemplate.generateStaticNarrative(resource, timezone);
  }

  /**
   * Internal static implementation that actually generates the narrative
   * @param resource - FHIR Bundle containing Composition resources
   * @param timezone - Optional timezone to use for date formatting (e.g., 'America/New_York', 'Europe/London')
   * @returns HTML string for rendering
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private static generateStaticNarrative(resource: TBundle, timezone?: string): string {
    // This is a simple template that just renders a heading
    return `<h1>International Patient Summary Document</h1>`;
  }
}
