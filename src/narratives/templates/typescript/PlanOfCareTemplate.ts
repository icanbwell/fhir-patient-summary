// PlanOfCareTemplate.ts - TypeScript replacement for Jinja2 planofcare.j2
import {TemplateUtilities} from './TemplateUtilities';
import {TBundle} from '../../../types/resources/Bundle';
import {TCarePlan} from '../../../types/resources/CarePlan';
import {ITemplate} from './interfaces/ITemplate';

/**
 * Class to generate HTML narrative for Plan of Care (CarePlan resources)
 * This replaces the Jinja2 planofcare.j2 template
 */
export class PlanOfCareTemplate implements ITemplate {
  /**
   * Generate HTML narrative for Plan of Care
   * @param resource - FHIR Bundle containing CarePlan resources
   * @param timezone - Optional timezone to use for date formatting (e.g., 'America/New_York', 'Europe/London')
   * @returns HTML string for rendering
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  generateNarrative(resource: TBundle, timezone: string | undefined): string {
    const templateUtilities = new TemplateUtilities(resource);
    // Start building the HTML table
    let html = `
      <h5>Plan of Care</h5>
      <table>
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
        // Add a table row for this care plan
        html += `
          <tr id="${(templateUtilities.narrativeLinkId(cp))}">
            <td>${cp.description || ''}</td>
            <td>${cp.intent || cp.intent || ''}</td>
            <td>${templateUtilities.concat(cp.note, 'text')}</td>
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
