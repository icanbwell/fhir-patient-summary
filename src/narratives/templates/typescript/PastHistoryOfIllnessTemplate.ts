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
   * @param now - Optional current date to use for generating relative dates in the narrative
   * @returns HTML string for rendering
   */
   
  generateNarrative(resources: TDomainResource[], timezone: string | undefined, now?: Date): string {
    const templateUtilities = new TemplateUtilities(resources);

    // Start building the HTML
    let html = `<p>This list includes past problems for the patient with a recorded date within the last 5 years, sorted by recorded date (most recent first).</p>\n`;

    const resolvedConditions: TCondition[] =
      resources.map(entry => entry as TCondition) || [];

    const currentDate = now || new Date();
    const fiveYearsAgo = new Date(currentDate);
    fiveYearsAgo.setFullYear(currentDate.getFullYear() - 5);

    // Count skipped conditions
    let skippedConditions = 0;
    const filteredConditions: TCondition[] = [];
    for (const cond of resolvedConditions) {
      if (cond.recordedDate && new Date(cond.recordedDate) >= fiveYearsAgo) {
        filteredConditions.push(cond);
      } else {
        skippedConditions++;
      }
    }

    // sort filtered conditions by onset date in descending order
    filteredConditions.sort((a, b) => {
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
              <th>Code (System)</th>
              <th>Onset Date</th>
              <th>Recorded Date</th>
              <th>Resolved Date</th>
            </tr>
          </thead>
          <tbody>`;

    const addedConditionCodes = new Set<string>();

    for (const cond of filteredConditions) {
      const conditionCode = templateUtilities.renderTextAsHtml(templateUtilities.codeableConceptDisplay(cond.code));
      if (!addedConditionCodes.has(conditionCode)) {
        // Skip if condition code is unknown
        if (conditionCode?.toLowerCase() === 'unknown') {
          continue;
        }
        addedConditionCodes.add(conditionCode);
        html += `<tr>
            <td class="Name">${templateUtilities.capitalizeFirstLetter(conditionCode)}</td>
            <td class="CodeSystem">${templateUtilities.codeableConceptCoding(cond.code)}</td>
            <td class="OnsetDate">${templateUtilities.renderDate(cond.onsetDateTime)}</td>
            <td class="RecordedDate">${templateUtilities.renderDate(cond.recordedDate)}</td>
            <td class="ResolvedDate">${templateUtilities.renderDate(cond.abatementDateTime)}</td>
          </tr>`;
      }
    }

    html += `</tbody>
        </table>`;
    if (skippedConditions > 0) {
      html += `\n<p><em>${skippedConditions} additional past illnesses older than 5 years ago are present</em></p>`;
    }

    return html;
  }
}
