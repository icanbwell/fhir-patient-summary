// FunctionalStatusTemplate.ts - TypeScript replacement for Jinja2 functionalstatus.j2
import { TemplateUtilities } from './TemplateUtilities';
import { TBundle } from '../../../types/resources/Bundle';
import { ITemplate } from './interfaces/ITemplate';
import {TClinicalImpression} from "../../../types/resources/ClinicalImpression";

/**
 * Class to generate HTML narrative for Functional Status (Observation resources)
 * This replaces the Jinja2 functionalstatus.j2 template
 */
export class FunctionalStatusTemplate implements ITemplate {
  /**
   * Generate HTML narrative for Functional Status
   * @param resource - FHIR Bundle containing Observation resources
   * @param timezone - Optional timezone to use for date formatting (e.g., 'America/New_York', 'Europe/London')
   * @returns HTML string for rendering
   */
  generateNarrative(resource: TBundle, timezone?: string): string {
    return FunctionalStatusTemplate.generateStaticNarrative(resource, timezone);
  }

  /**
   * Internal static implementation that actually generates the narrative
   * @param resource - FHIR Bundle containing Observation resources
   * @param timezone - Optional timezone to use for date formatting (e.g., 'America/New_York', 'Europe/London')
   * @returns HTML string for rendering
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private static generateStaticNarrative(resource: TBundle, timezone?: string): string {
    const templateUtilities = new TemplateUtilities(resource);
    // Start building the HTML table
    let html = `
      <h5>Functional Status</h5>
      <table class="hapiPropertyTable">
        <thead>
          <tr>
            <th>Assessment</th>
            <th>Status</th>
            <th>Finding</th>
            <th>Comments</th>
            <th>Date</th>
          </tr>
        </thead>
        <tbody>`;

    // Check if we have entries in the bundle
    if (resource.entry && Array.isArray(resource.entry)) {
      // Loop through entries in the bundle
      for (const entry of resource.entry) {
        const ci = entry.resource as TClinicalImpression;

        // Skip Composition resources
        if (ci.resourceType === 'Composition') {
          continue;
        }

        // Use the enhanced narrativeLinkId utility function to extract the ID directly from the resource
        const narrativeLinkId = templateUtilities.narrativeLinkId(ci);

        // Add a table row for this clinical impression
        html += `
          <tr id="${narrativeLinkId}">
            <td>${templateUtilities.codeableConcept(ci.code, 'display')}</td>
            <td>${ci.status || ''}</td>
            <td>${ci.summary || ''}</td>
            <td>${templateUtilities.safeConcat(ci.note, 'text')}</td>
            <td>${templateUtilities.renderEffective(ci.effectiveDateTime)}</td>
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
