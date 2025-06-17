// PlanOfCareTemplate.ts - TypeScript replacement for Jinja2 planofcare.j2
import { TemplateUtilities } from './TemplateUtilities';
import { TBundle } from '../../../types/resources/Bundle';
import { TCarePlan } from '../../../types/resources/CarePlan';

/**
 * Class to generate HTML narrative for Care Plan resources
 * This replaces the Jinja2 planofcare.j2 template
 */
export class PlanOfCareTemplate {
  /**
   * Generate HTML narrative for Plan of Care
   * @param resource - FHIR Bundle containing CarePlan resources
   * @returns HTML string for rendering
   */
  static generateNarrative(resource: TBundle): string {
    // Start building the HTML table
    let html = `
      <h5>Plan of Care</h5>
      <table class="hapiPropertyTable">
        <thead>
          <tr>
            <th>Activity</th>
            <th>Intent</th>
            <th>Comments</th>
            <th>Planned Start</th>
            <th>Planned End</th>
          </tr>
        </thead>
        <tbody>`;

    // Check if we have entries in the bundle
    if (resource.entry && Array.isArray(resource.entry)) {
      // Loop through entries in the bundle
      for (const entry of resource.entry) {
        const cp = entry.resource as TCarePlan;

        // Skip Composition resources
        if (cp.resourceType === 'Composition') {
          continue;
        }

        // Use the enhanced narrativeLinkId utility function to extract the ID directly from the resource
        const narrativeLinkId = TemplateUtilities.narrativeLinkId(cp);

        // Add a table row for this care plan
        html += `
          <tr id="${narrativeLinkId}">
            <td>${cp.description || ''}</td>
            <td>${cp.intent || cp.intent || ''}</td>
            <td>${TemplateUtilities.concat(cp.note, 'text')}</td>
            <td>${cp.period?.start || ''}</td>
            <td>${cp.period?.end || ''}</td>
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
