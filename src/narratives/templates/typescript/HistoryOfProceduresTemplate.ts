// HistoryOfProceduresTemplate.ts - TypeScript replacement for Jinja2 historyofprocedures.j2
import {TemplateUtilities} from './TemplateUtilities';
import {TDomainResource} from '../../../types/resources/DomainResource';
import {TProcedure} from '../../../types/resources/Procedure';
import {ISummaryTemplate} from './interfaces/ITemplate';
import { TComposition } from '../../../types/resources/Composition';

/**
 * Class to generate HTML narrative for Procedure resources
 * This replaces the Jinja2 historyofprocedures.j2 template
 */
export class HistoryOfProceduresTemplate implements ISummaryTemplate {
  /**
   * Generate HTML narrative for Procedure resources
   * @param resources - FHIR Procedure resources
   * @param timezone - Optional timezone to use for date formatting (e.g., 'America/New_York', 'Europe/London')
   * @returns HTML string for rendering
   */
  generateNarrative(resources: TDomainResource[], timezone: string | undefined): string {
    // sort the entries by performed date in descending order
    resources.sort((a, b) => {
      const dateA = (a as TProcedure).performedDateTime || (a as TProcedure).performedPeriod?.start;
      const dateB = (b as TProcedure).performedDateTime || (b as TProcedure).performedPeriod?.start;
      return dateA && dateB ? new Date(dateB).getTime() - new Date(dateA).getTime() : 0;
    });

    return HistoryOfProceduresTemplate.generateStaticNarrative(resources, timezone);
  }

  /**
   * Generate HTML narrative for Procedure resources using summary
   * @param resources - FHIR Composition resources
   * @param timezone - Optional timezone to use for date formatting (e.g., 'America/New_York', 'Europe/London')
   * @returns HTML string for rendering
   */
  public generateSummaryNarrative(
    resources: TComposition[],
    timezone: string | undefined
  ): string | undefined {
    const templateUtilities = new TemplateUtilities(resources);
    let isSummaryCreated = false;

    let html = `<p>This list includes all Procedure resources, sorted by performed date (most recent first).</p>\n`;
    html += `
      <div>
        <table>
          <thead>
            <tr>
              <th>Procedure</th>
              <th>Code (System)</th>
              <th>Performer</th>
              <th>Date</th>
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
            case 'Procedure Name':
              data['procedure'] = columnData.text?.div ?? '';
              break;
            case 'Performer':
              data['performer'] = columnData.text?.div ?? '';
              break;
            case 'Performed Date':
              data['date'] = columnData.text?.div ?? '';
              break;
                break;
            default:
              break;
          }
        }

        // Skip if procedure name is unknown
        if (data['procedure']?.toLowerCase() === 'unknown') {
          continue;
        }

        isSummaryCreated = true;
        html += `
            <tr>
              <td>${templateUtilities.capitalizeFirstLetter(data['procedure'] ?? '')}</td>
               <td>${data['codeSystem'] ?? ''}</td>
              <td>${data['performer'] ?? ''}</td>
              <td>${templateUtilities.renderTime(data['date'], timezone) ?? ''}</td>
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
   * @param resources - FHIR Procedure resources
   * @param timezone - Optional timezone to use for date formatting (e.g., 'America/New_York', 'Europe/London')
   * @returns HTML string for rendering
   */
  private static generateStaticNarrative(resources: TDomainResource[], timezone: string | undefined): string {
    const templateUtilities = new TemplateUtilities(resources);
    // Start building the HTML table
    let html = `<p>This list includes all Procedure resources, sorted by performed date (most recent first).</p>\n`;
    html += `
      <table>
        <thead>
          <tr>
            <th>Procedure</th>
            <th>Code (System)</th>
            <th>Comments</th>
            <th>Date</th>
          </tr>
        </thead>
        <tbody>`;
    for (const resourceItem of resources) {
      const proc = resourceItem as TProcedure;
      // Skip if procedure name is unknown
      const procedureName = templateUtilities.codeableConceptDisplay(proc.code, 'display');
      if (procedureName?.toLowerCase() === 'unknown') {
        continue;
      }
      html += `
        <tr>
          <td>${templateUtilities.capitalizeFirstLetter(templateUtilities.renderTextAsHtml(procedureName))}</td>
          <td>${templateUtilities.codeableConceptCoding(proc.code)}</td>
          <td>${templateUtilities.renderNotes(proc.note, timezone)}</td>
          <td>${templateUtilities.renderTime(proc.performedDateTime || proc.performedPeriod?.start, timezone)}</td>
        </tr>`;
    }

    // Close the HTML table
    html += `
        </tbody>
      </table>`;

    return html;
  }
}
