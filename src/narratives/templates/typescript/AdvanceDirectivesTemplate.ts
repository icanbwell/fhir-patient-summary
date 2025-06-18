// AdvanceDirectivesTemplate.ts - TypeScript replacement for Jinja2 advancedirectives.j2
import { TemplateUtilities } from './TemplateUtilities';
import { TBundle } from '../../../types/resources/Bundle';
import { TConsent } from '../../../types/resources/Consent';
import { ITemplate } from './interfaces/ITemplate';

/**
 * Class to generate HTML narrative for Advance Directives (Consent resources)
 * This replaces the Jinja2 advancedirectives.j2 template
 */
export class AdvanceDirectivesTemplate implements ITemplate {
  /**
   * Generate HTML narrative for Advance Directives
   * @param resource - FHIR Bundle containing Advance Directive resources
   * @param timezone - Optional timezone to use for date formatting (e.g., 'America/New_York', 'Europe/London')
   * @returns HTML string for rendering
   */
  generateNarrative(resource: TBundle, timezone?: string): string {
    return AdvanceDirectivesTemplate.generateStaticNarrative(resource, timezone);
  }

  /**
   * Static implementation of generateNarrative for use with TypeScriptTemplateMapper
   * @param resource - FHIR Bundle containing Advance Directive resources
   * @param timezone - Optional timezone to use for date formatting (e.g., 'America/New_York', 'Europe/London')
   * @returns HTML string for rendering
   */
  static generateNarrative(resource: TBundle, timezone?: string): string {
    return AdvanceDirectivesTemplate.generateStaticNarrative(resource, timezone);
  }

  /**
   * Internal static implementation that actually generates the narrative
   * @param resource - FHIR Bundle containing Advance Directive resources
   * @param timezone - Optional timezone to use for date formatting (e.g., 'America/New_York', 'Europe/London')
   * @returns HTML string for rendering
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private static generateStaticNarrative(resource: TBundle, timezone?: string): string {

    const templateUtilities = new TemplateUtilities(resource);
    // Start building the HTML table
    let html = `
      <h5>Advance Directives</h5>
      <table class="hapiPropertyTable">
        <thead>
          <tr>
            <th>Scope</th>
            <th>Status</th>
            <th>Action Controlled</th>
            <th>Date</th>
          </tr>
        </thead>
        <tbody>`;

    // Check if we have entries in the bundle
    if (resource.entry && Array.isArray(resource.entry)) {
      // Loop through entries in the bundle
      for (const entry of resource.entry) {
        const consent = entry.resource as TConsent;

        // Skip Composition resources
        if (consent.resourceType === 'Composition') {
          continue;
        }

        // Use the enhanced narrativeLinkId utility function to extract the ID
        const narrativeLinkId = templateUtilities.narrativeLinkId(consent);

        // Add a table row for this consent
        html += `
          <tr id="${narrativeLinkId}">
            <td>${templateUtilities.codeableConcept(consent.scope, 'display')}</td>
            <td>${consent.status || ''}</td>
            <td>${consent.provision?.action ? templateUtilities.concatCodeableConcept(consent.provision.action) : ''}</td>
            <td>${consent.dateTime || ''}</td>
          </tr>`;
      }
    }

    // Close the HTML table
    html += `
        </tbody>
      </table>`;

    return html;
  }
}
