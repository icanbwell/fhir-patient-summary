// ProblemListTemplate.ts - TypeScript replacement for Jinja2 problemlist.j2
import { TemplateUtilities } from './TemplateUtilities';
import { TDomainResource } from '../../../types/resources/DomainResource';
import { TCondition } from '../../../types/resources/Condition';
import { ISummaryTemplate } from './interfaces/ITemplate';
import { TComposition } from '../../../types/resources/Composition';

/**
 * Class to generate HTML narrative for Problem List (Condition resources)
 * This replaces the Jinja2 problemlist.j2 template
 */
export class ProblemListTemplate implements ISummaryTemplate {
  /**
   * Generate HTML narrative for Problem List
   * @param resources - FHIR Condition resources
   * @param timezone - Optional timezone to use for date formatting (e.g., 'America/New_York', 'Europe/London')
   * @returns HTML string for rendering
   */
  public generateNarrative(resources: TDomainResource[], timezone: string | undefined): string {
    return ProblemListTemplate.generateStaticNarrative(resources, timezone);
  }

  /**
   * Generate HTML narrative for Problem List using summary composition
   * @param resources - FHIR Composition resources
   * @param timezone - Optional timezone to use for date formatting (e.g., 'America/New_York', 'Europe/London')
   * @returns HTML string for rendering or undefined if no summary data was created
   */
  public generateSummaryNarrative(resources: TComposition[], timezone: string | undefined): string | undefined {
    const templateUtilities = new TemplateUtilities(resources);
    let isSummaryCreated = false;

    let html = `<p>This list includes patient problems</p>\n`;
    html += `
      <div>
        <table>
          <thead>
            <tr>
              <th>Problem</th>
              <th>Code (System)</th>
              <th>Onset Date</th>
              <th>Recorded Date</th>
              <th>Source</th>
            </tr>
          </thead>
          <tbody>`;
    
    for (const resourceItem of resources) {
      for (const rowData of resourceItem.section ?? []) {
        const sectionCodeableConcept = rowData.code;
        const data: Record<string, string> = {};
        data["codeSystem"] = templateUtilities.codeableConceptCoding(sectionCodeableConcept);
        
        for (const columnData of rowData.section ?? []) {
          switch (columnData.title) {
            case 'Problem Name':
              data["problem"] = templateUtilities.renderTextAsHtml(columnData.text?.div ?? "");
              break;
            case 'Onset Date':
              data["onsetDate"] = templateUtilities.renderTextAsHtml(columnData.text?.div ?? "");
              break;
            case 'Recorded Date':
              data["recordedDate"] = templateUtilities.renderTextAsHtml(columnData.text?.div ?? "");
              break;
            case 'Source':
              data["source"] = templateUtilities.renderTextAsHtml(columnData.text?.div ?? "");
              break;
            default:
              break;
          }
        }

        isSummaryCreated = true;
        html += `
          <tr>
            <td class="Name">${templateUtilities.capitalizeFirstLetter(data["problem"] ?? "")}</td>
            <td class="CodeSystem">${data["codeSystem"] ?? ""}</td>
            <td class="OnsetDate">${templateUtilities.renderTime(data["onsetDate"], timezone) ?? ""}</td>
            <td class="RecordedDate">${templateUtilities.renderTime(data["recordedDate"], timezone) ?? ""}</td>
            <td class="Source">${data["source"] ?? ""}</td>
          </tr>`;
      }
    }

    html += `
          </tbody>
        </table>
      </div>`;

    return isSummaryCreated ? html : undefined;
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
              <th>Source</th>
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
      seenCodeAndSystems.add(codeAndSystem);
      html += `<tr>
          <td class="Name">${templateUtilities.capitalizeFirstLetter(conditionDisplay)}</td>
          <td class="CodeSystem">${codeAndSystem}</td>
          <td class="OnsetDate">${templateUtilities.renderDate(cond.onsetDateTime)}</td>
          <td class="RecordedDate">${templateUtilities.renderDate(cond.recordedDate)}</td>
          <td class="Source">${templateUtilities.getOwnerTag(cond)}</td>
        </tr>`;
    }

    html += `</tbody>
        </table>`;

    return html;
  }
}
