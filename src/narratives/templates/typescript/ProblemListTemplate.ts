// ProblemListTemplate.ts - TypeScript replacement for Jinja2 problemlist.j2
import { TemplateUtilities } from './TemplateUtilities';
import { TBundle } from '../../../types/resources/Bundle';
import { TCondition } from '../../../types/resources/Condition';

/**
 * Class to generate HTML narrative for Problem List (Condition resources)
 * This replaces the Jinja2 problemlist.j2 template
 */
export class ProblemListTemplate {
  /**
   * Generate HTML narrative for Problem List
   * @param resource - FHIR Bundle containing Condition resources
   * @returns HTML string for rendering
   */
  static generateNarrative(resource: TBundle): string {
    // Start building the HTML table
    let html = `
      <h5>Problem List</h5>
      <table class="hapiPropertyTable">
        <thead>
          <tr>
            <th>Medical Problems</th>
            <th>Status</th>
            <th>Comments</th>
            <th>Onset Date</th>
          </tr>
        </thead>
        <tbody>`;

    // Check if we have entries in the bundle
    if (resource.entry && Array.isArray(resource.entry)) {
      // Loop through entries in the bundle
      for (const entry of resource.entry) {
        const cond = entry.resource as TCondition;

        // Skip composition resources
        if (cond.resourceType === 'Composition') {
          continue;
        }

        // Use the enhanced narrativeLinkId utility function to extract the ID directly from the resource
        const narrativeLinkId = TemplateUtilities.narrativeLinkId(cond);

        // Add a table row for this condition
        html += `
          <tr id="${narrativeLinkId}">
            <td>${TemplateUtilities.codeableConcept(cond.code)}</td>
            <td>${TemplateUtilities.codeableConcept(cond.clinicalStatus)}</td>
            <td>${TemplateUtilities.safeConcat(cond.note, 'text')}</td>
            <td>${TemplateUtilities.renderTime(cond.onset)}</td>
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
