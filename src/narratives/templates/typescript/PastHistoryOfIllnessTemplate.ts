// PastHistoryOfIllnessTemplate.ts - TypeScript replacement for Jinja2 pasthistoryofillness.j2
import {TemplateUtilities} from './TemplateUtilities';
import {TBundle} from '../../../types/resources/Bundle';
import {TCondition} from '../../../types/resources/Condition';
import {ITemplate} from './interfaces/ITemplate';

/**
 * Class to generate HTML narrative for Past History of Illness (Condition resources)
 * This replaces the Jinja2 pasthistoryofillness.j2 template
 */
export class PastHistoryOfIllnessTemplate implements ITemplate {
  /**
   * Generate HTML narrative for Past History of Illnesses
   * @param resource - FHIR Bundle containing Condition resources
   * @param timezone - Optional timezone to use for date formatting (e.g., 'America/New_York', 'Europe/London')
   * @returns HTML string for rendering
   */
  generateNarrative(resource: TBundle, timezone: string | undefined): string {
    return PastHistoryOfIllnessTemplate.generateStaticNarrative(resource, timezone);
  }

  /**
   * Internal static implementation that actually generates the narrative
   * @param resource - FHIR Bundle containing Condition resources
   * @param timezone - Optional timezone to use for date formatting (e.g., 'America/New_York', 'Europe/London')
   * @returns HTML string for rendering
   */
  private static generateStaticNarrative(resource: TBundle, timezone: string | undefined): string {
        const templateUtilities = new TemplateUtilities(resource);
    // Start building the HTML table
    let html = `
      <h5>Past History of Illnesses</h5>
      <table class="hapiPropertyTable">
        <thead>
          <tr>
            <th>Medical Problems</th>
            <th>Status</th>
            <th>Comments</th>
            <th>Date</th>
          </tr>
        </thead>
        <tbody>`;

    // Check if we have entries in the bundle
    if (resource.entry && Array.isArray(resource.entry)) {
      // Loop through entries in the bundle
      for (const entry of resource.entry) {
        const cond = entry.resource as TCondition;

        // Skip Composition resources
        if (cond.resourceType === 'Composition') {
          continue;
        }

        // Use the enhanced narrativeLinkId utility function to extract the ID directly from the resource
        // Add a table row for this condition
        html += `
          <tr id="${(templateUtilities.narrativeLinkId(cond))}">
            <td>${templateUtilities.codeableConcept(cond.code, 'display')}</td>
            <td>${templateUtilities.codeableConcept(cond.clinicalStatus, 'code')}</td>
            <td>${templateUtilities.renderNotes(cond.note, timezone)}</td>
            <td>${templateUtilities.renderTime(cond.onsetDateTime, timezone)}</td>
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
