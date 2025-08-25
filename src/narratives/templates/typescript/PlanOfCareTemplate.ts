// PlanOfCareTemplate.ts - TypeScript replacement for Jinja2 planofcare.j2
import { TemplateUtilities } from './TemplateUtilities';
import { TDomainResource } from '../../../types/resources/DomainResource';
import { TCarePlan } from '../../../types/resources/CarePlan';
import { ITemplate } from './interfaces/ITemplate';

/**
 * Class to generate HTML narrative for Plan of Care (CarePlan resources)
 * This replaces the Jinja2 planofcare.j2 template
 */
export class PlanOfCareTemplate implements ITemplate {
  /**
   * Generate HTML narrative for Plan of Care
   * @param resources - FHIR CarePlan resources
   * @param timezone - Optional timezone to use for date formatting (e.g., 'America/New_York', 'Europe/London')
   * @returns HTML string for rendering
   */
  generateNarrative(resources: TDomainResource[], timezone: string | undefined): string {
    const templateUtilities = new TemplateUtilities(resources);

    const carePlans = resources.map(entry => entry as TCarePlan) || [];

    // sort care plans by period end date, if available in descending order
    carePlans.sort((a, b) => {
      const endA = a.period?.end ? new Date(a.period?.end).getTime() : 0;
      const endB = b.period?.end ? new Date(b.period?.end).getTime() : 0;
      return endB - endA;
    });

    // Start building the HTML table
    let html = `
      <table>
        <thead>
          <tr>
            <th>Description</th>
            <th>Intent</th>
            <th>Comments</th>
            <th>Planned Start</th>
            <th>Planned End</th>
          </tr>
        </thead>
        <tbody>`;

    // Loop through entries in the resources
    for (const cp of carePlans) {
      // Use the enhanced narrativeLinkId utility function to extract the ID directly from the resource
      // Add a table row for this care plan
      html += `
          <tr id="${templateUtilities.narrativeLinkId(cp)}">
            <td>${cp.description || cp.title || ''}</td>
            <td>${cp.intent || ''}</td>
            <td>${templateUtilities.concat(cp.note, 'text')}</td>
            <td>${cp.period?.start ? templateUtilities.renderTime(cp.period?.start, timezone) : ''}</td>
            <td>${cp.period?.end ? templateUtilities.renderTime(cp.period?.end, timezone) : ''}</td>
          </tr>`;
    }

    // Close the HTML table
    html += `
        </tbody>
      </table>`;

    return html;
  }
}
