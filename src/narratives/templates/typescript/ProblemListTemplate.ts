// ProblemListTemplate.ts - TypeScript replacement for Jinja2 problemlist.j2
import { TemplateUtilities } from './TemplateUtilities';
import { TBundle } from '../../../types/resources/Bundle';
import { TCondition } from '../../../types/resources/Condition';
import { ITemplate } from './interfaces/ITemplate';

/**
 * Class to generate HTML narrative for Problem List (Condition resources)
 * This replaces the Jinja2 problemlist.j2 template
 */
export class ProblemListTemplate implements ITemplate {
  /**
   * Generate HTML narrative for Problem List
   * @param resource - FHIR Bundle containing Condition resources
   * @param timezone - Optional timezone to use for date formatting (e.g., 'America/New_York', 'Europe/London')
   * @returns HTML string for rendering
   */
  generateNarrative(resource: TBundle, timezone: string | undefined): string {
    return ProblemListTemplate.generateStaticNarrative(resource, timezone);
  }

  /**
   * Internal static implementation that actually generates the narrative
   * @param resource - FHIR Bundle containing Condition resources
   * @param timezone - Optional timezone to use for date formatting (e.g., 'America/New_York', 'Europe/London')
   * @returns HTML string for rendering
   */
  private static generateStaticNarrative(
    resource: TBundle,
    timezone: string | undefined
  ): string {
    const templateUtilities = new TemplateUtilities(resource);

    // Start building the HTML
    let html = ``;

    const activeConditions: TCondition[] =
      resource.entry?.map(entry => entry.resource as TCondition) || [];

    // sort conditions by onset date in descending order
    activeConditions.sort((a, b) => {
      const dateA = a.onsetDateTime ? new Date(a.onsetDateTime).getTime() : 0;
      const dateB = b.onsetDateTime ? new Date(b.onsetDateTime).getTime() : 0;
      return dateB - dateA;
    });

    // Generate active problems section
    html += `
        <table>
          <thead>
            <tr>
              <th>Problem</th>
              <th>Severity</th>
              <th>Onset Date</th>
              <th>Recorded Date</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>`;

    for (const cond of activeConditions) {
      html += `<tr id="${templateUtilities.narrativeLinkId(cond)}">
          <td class="Name">${templateUtilities.codeableConcept(cond.code)}</td>
          <td class="Severity">${templateUtilities.codeableConcept(cond.severity)}</td>
          <td class="OnsetDate">${templateUtilities.renderDate(cond.onsetDateTime)}</td>
          <td class="RecordedDate">${templateUtilities.renderDate(cond.recordedDate)}</td>
          <td class="Notes">${templateUtilities.renderNotes(cond.note, timezone)}</td>
        </tr>`;
    }

    html += `</tbody>
        </table>`;

    return html;
  }
}
