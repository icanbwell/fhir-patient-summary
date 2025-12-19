// ProblemListTemplate.ts - TypeScript replacement for Jinja2 problemlist.j2
import { TemplateUtilities } from './TemplateUtilities';
import { TDomainResource } from '../../../types/resources/DomainResource';
import { TCondition } from '../../../types/resources/Condition';
import { ITemplate } from './interfaces/ITemplate';

/**
 * Class to generate HTML narrative for Problem List (Condition resources)
 * This replaces the Jinja2 problemlist.j2 template
 */
export class ProblemListTemplate implements ITemplate {
  /**
   * Generate HTML narrative for Problem List
   * @param resources - FHIR Condition resources
   * @param timezone - Optional timezone to use for date formatting (e.g., 'America/New_York', 'Europe/London')
   * @returns HTML string for rendering
   */
  generateNarrative(resources: TDomainResource[], timezone: string | undefined): string {
    return ProblemListTemplate.generateStaticNarrative(resources, timezone);
  }

  /**
   * Internal static implementation that actually generates the narrative
   * @param resources - FHIR Condition resources
   * @param timezone - Optional timezone to use for date formatting (e.g., 'America/New_York', 'Europe/London')
   * @returns HTML string for rendering
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private static generateStaticNarrative(resources: TDomainResource[], timezone: string | undefined): string {
    const templateUtilities = new TemplateUtilities(resources);

    // Start building the HTML
    let html = `<p>This list includes patient problems, sorted by recorded date (most recent first)</p>\n`;

    const activeConditions: TCondition[] =
      resources.map(entry => entry as TCondition) || [];

    // sort conditions by onset date in descending order
    activeConditions.sort((a, b) => {
      // If a.recordedDate is missing, treat as most recent (active)
      if (!a.recordedDate && b.recordedDate) return -1;
      if (a.recordedDate && !b.recordedDate) return 1;
      if (!a.recordedDate && !b.recordedDate) return 0;
      const dateA = new Date(a.recordedDate!).getTime();
      const dateB = new Date(b.recordedDate!).getTime();
      return dateB - dateA;
    });

    // Generate active problems section
    html += `
        <table>
          <thead>
            <tr>
              <th>Problem</th>
              <th>Code (System)</th>
              <th>Onset Date</th>
              <th>Recorded Date</th>
            </tr>
          </thead>
          <tbody>`;

    // Track seen codeAndSystem values to avoid duplicates
    const seenCodeAndSystems = new Set<string>();

    for (const cond of activeConditions) {
      const conditionDisplay = templateUtilities.codeableConceptDisplay(cond.code);
      const codeAndSystem = templateUtilities.codeableConceptCoding(cond.code);
      if (codeAndSystem && seenCodeAndSystems.has(codeAndSystem)) {
        continue;
      }
      // Skip if condition display is unknown
      if (conditionDisplay?.toLowerCase() === 'unknown') {
        continue;
      }
      seenCodeAndSystems.add(codeAndSystem);
      html += `<tr>
          <td class="Name">${templateUtilities.capitalizeFirstLetter(conditionDisplay)}</td>
          <td class="CodeSystem">${codeAndSystem}</td>
          <td class="OnsetDate">${templateUtilities.renderDate(cond.onsetDateTime)}</td>
          <td class="RecordedDate">${templateUtilities.renderDate(cond.recordedDate)}</td>
        </tr>`;
    }

    html += `</tbody>
        </table>`;

    return html;
  }
}
