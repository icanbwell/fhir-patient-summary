// AdvanceDirectivesTemplate.ts - TypeScript replacement for Jinja2 advancedirectives.j2
import { TemplateUtilities } from './TemplateUtilities';
import { TBundle } from '../../../types/resources/Bundle';
import { TConsent } from '../../../types/resources/Consent';

/**
 * Class to generate HTML narrative for Advance Directives (Consent resources)
 * This replaces the Jinja2 advancedirectives.j2 template
 */
export class AdvanceDirectivesTemplate {
  /**
   * Generate HTML narrative for Advance Directives
   * @param resource - FHIR Bundle containing Consent resources
   * @returns HTML string for rendering
   */
  static generateNarrative(resource: TBundle): string {
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
        const narrativeLinkId = TemplateUtilities.narrativeLinkId(consent);

        // Add a table row for this consent
        html += `
          <tr id="${narrativeLinkId}">
            <td>${TemplateUtilities.codeableConcept(consent.scope, 'display')}</td>
            <td>${consent.status || ''}</td>
            <td>${consent.provision?.action ? TemplateUtilities.concatCodeableConcept(consent.provision.action) : ''}</td>
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
