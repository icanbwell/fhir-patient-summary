// CompositionTemplate.ts - TypeScript replacement for Jinja2 composition.j2
import { TBundle } from '../../../types/resources/Bundle';

/**
 * Class to generate HTML narrative for Composition resources
 * This replaces the Jinja2 composition.j2 template
 */
export class CompositionTemplate {
  /**
   * Generate HTML narrative for Composition
   * @param resource - FHIR Bundle containing Composition resource
   * @returns HTML string for rendering
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  static generateNarrative(resource: TBundle): string {
    // This is a simple template that just renders a heading
    return `<h1>International Patient Summary Document</h1>`;
  }
}
