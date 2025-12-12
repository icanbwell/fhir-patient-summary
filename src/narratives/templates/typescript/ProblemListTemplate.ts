// ProblemListTemplate.ts - TypeScript replacement for Jinja2 problemlist.j2
import { TemplateUtilities } from './TemplateUtilities';
import { TDomainResource } from '../../../types/resources/DomainResource';
import { TCondition } from '../../../types/resources/Condition';
import { ITemplate } from './interfaces/ITemplate';
import CODING_SYSTEM_DISPLAY_NAMES from "../../../structures/codingSystemDisplayNames";

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
    let html = ``;

    const activeConditions: TCondition[] =
      resources.map(entry => entry as TCondition) || [];

    // sort conditions by onset date in descending order
    activeConditions.sort((a, b) => {
      const dateA = a.recordedDate ? new Date(a.recordedDate).getTime() : 0;
      const dateB = b.recordedDate ? new Date(b.recordedDate).getTime() : 0;
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

    const addedConditionCodes = new Set<string>();

    for (const cond of activeConditions) {
      const conditionCode = templateUtilities.renderTextAsHtml(templateUtilities.codeableConcept(cond.code));
      // Extract system and code from the first coding, if available
      let system = '';
      let code = '';
      let systemDisplay = '';
      if (cond.code && Array.isArray(cond.code.coding) && cond.code.coding.length > 0) {
        system = cond.code.coding[0].system || '';
        code = cond.code.coding[0].code || '';
        systemDisplay = CODING_SYSTEM_DISPLAY_NAMES[system] || system;
      }
      const codeSystemDisplay = code ? `${code} (${systemDisplay})` : '';
      if (!addedConditionCodes.has(conditionCode)) {
        addedConditionCodes.add(conditionCode);
        html += `<tr id="${templateUtilities.narrativeLinkId(cond)}">
            <td class="Name">${conditionCode}</td>
            <td class="CodeSystem">${codeSystemDisplay}</td>
            <td class="OnsetDate">${templateUtilities.renderDate(cond.onsetDateTime)}</td>
            <td class="RecordedDate">${templateUtilities.renderDate(cond.recordedDate)}</td>
          </tr>`;
      }
    }

    html += `</tbody>
        </table>`;

    return html;
  }
}
