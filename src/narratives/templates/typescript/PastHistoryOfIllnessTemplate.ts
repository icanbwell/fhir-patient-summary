// PastHistoryOfIllnessTemplate.ts - TypeScript replacement for Jinja2 pasthistoryofillness.j2
import { TemplateUtilities } from './TemplateUtilities';
import { TDomainResource } from '../../../types/resources/DomainResource';
import { TCondition } from '../../../types/resources/Condition';
import { ITemplate } from './interfaces/ITemplate';

/**
 * Class to generate HTML narrative for Past History of Illness (Condition resources)
 * This replaces the Jinja2 pasthistoryofillness.j2 template
 */
export class PastHistoryOfIllnessTemplate implements ITemplate {
  /**
   * Generate HTML narrative for Past History of Illnesses
   * @param resources - FHIR Condition resources
   * @param timezone - Optional timezone to use for date formatting (e.g., 'America/New_York', 'Europe/London')
   * @returns HTML string for rendering
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  generateNarrative(resources: TDomainResource[], timezone: string | undefined): string {
    const templateUtilities = new TemplateUtilities(resources);

    // Start building the HTML
    let html = ``;

    const resolvedConditions: TCondition[] =
      resources.map(entry => entry as TCondition) || [];

    // sort conditions by onset date in descending order
    resolvedConditions.sort((a, b) => {
      const dateA = a.recordedDate ? new Date(a.recordedDate).getTime() : 0;
      const dateB = b.recordedDate ? new Date(b.recordedDate).getTime() : 0;
      return dateB - dateA;
    });

    // Generate resolved problems section
    html += `
        <table>
          <thead>
            <tr>
              <th>Problem</th>
              <th>Onset Date</th>
              <th>Recorded Date</th>
              <th>Resolved Date</th>
            </tr>
          </thead>
          <tbody>`;

    const addedConditionCodes = new Set<string>();

    for (const cond of resolvedConditions) {
      const conditionCode = templateUtilities.renderTextAsHtml(templateUtilities.codeableConceptDisplay(cond.code));
      if (!addedConditionCodes.has(conditionCode)) {
        addedConditionCodes.add(conditionCode);
        html += `<tr id="${templateUtilities.narrativeLinkId(cond)}">
            <td class="Name">${conditionCode}</td>
            <td class="OnsetDate">${templateUtilities.renderDate(cond.onsetDateTime)}</td>
            <td class="RecordedDate">${templateUtilities.renderDate(cond.recordedDate)}</td>
            <td class="ResolvedDate">${templateUtilities.renderDate(cond.abatementDateTime)}</td>
          </tr>`;
      }
    }

    html += `</tbody>
        </table>`;

    return html;
  }
}
