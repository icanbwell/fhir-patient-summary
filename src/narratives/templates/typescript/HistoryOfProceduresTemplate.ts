// HistoryOfProceduresTemplate.ts - TypeScript replacement for Jinja2 historyofprocedures.j2
import { TemplateUtilities } from './TemplateUtilities';
import { TBundle } from '../../../types/resources/Bundle';
import { TProcedure } from '../../../types/resources/Procedure';
import { ITemplate } from './interfaces/ITemplate';

/**
 * Class to generate HTML narrative for Procedure resources
 * This replaces the Jinja2 historyofprocedures.j2 template
 */
export class HistoryOfProceduresTemplate implements ITemplate {
  /**
   * Generate HTML narrative for Procedure resources
   * @param resource - FHIR Bundle containing Procedure resources
   * @param timezone - Optional timezone to use for date formatting (e.g., 'America/New_York', 'Europe/London')
   * @returns HTML string for rendering
   */
  generateNarrative(resource: TBundle, timezone?: string): string {
    return HistoryOfProceduresTemplate.generateStaticNarrative(resource, timezone);
  }

  /**
   * Internal static implementation that actually generates the narrative
   * @param resource - FHIR Bundle containing Procedure resources
   * @param timezone - Optional timezone to use for date formatting (e.g., 'America/New_York', 'Europe/London')
   * @returns HTML string for rendering
   */
  private static generateStaticNarrative(resource: TBundle, timezone?: string): string {
    const templateUtilities = new TemplateUtilities(resource);
    // Start building the HTML table
    let html = `
      <h5>History Of Procedures</h5>
      <table class="hapiPropertyTable">
        <thead>
          <tr>
            <th>Procedure</th>
            <th>Comments</th>
            <th>Date</th>
          </tr>
        </thead>
        <tbody>`;

    // Check if we have entries in the bundle
    if (resource.entry && Array.isArray(resource.entry)) {
      // Loop through entries in the bundle
      for (const entry of resource.entry) {
        const proc = entry.resource as TProcedure;

        // Skip Composition resources
        if (proc.resourceType === 'Composition') {
          continue;
        }

        // Use the enhanced narrativeLinkId utility function to extract the ID directly from the resource
        const narrativeLinkId = templateUtilities.narrativeLinkId(proc);

        // Add a table row for this procedure
        html += `
          <tr id="${narrativeLinkId}">
            <td>${templateUtilities.codeableConcept(proc.code, 'display')}</td>
            <td>${templateUtilities.safeConcat(proc.note, 'text')}</td>
            <td>${templateUtilities.renderTime(proc.performedDateTime, timezone)}</td>
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
