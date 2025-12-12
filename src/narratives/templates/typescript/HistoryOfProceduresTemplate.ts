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

    let html = `
      <div>
        <table>
          <thead>
            <tr>
              <th>Procedure</th>
              <th>Performer</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>`;

    for (const resourceItem of resources) {
      for (const rowData of resourceItem.section ?? []) {
        const data: Record<string, string> = {};
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
            default:
              break;
          }
        }

        isSummaryCreated = true;
        html += `
            <tr>
              <td>${data['procedure'] ?? '-'}</td>
              <td>${data['performer'] ?? '-'}</td>
              <td>${templateUtilities.renderTime(data['date'], timezone) ?? '-'}</td>
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
    let html = `
      <table>
        <thead>
          <tr>
            <th>Procedure</th>
            <th>Comments</th>
            <th>Date</th>
          </tr>
        </thead>
        <tbody>`;

    for (const resourceItem of resources) {
      const proc = resourceItem as TProcedure;

      // Use the enhanced narrativeLinkId utility function to extract the ID directly from the resource
      // Add a table row for this procedure
      html += `
        <tr id="${(templateUtilities.narrativeLinkId(proc))}">
          <td>${templateUtilities.renderTextAsHtml(templateUtilities.codeableConcept(proc.code, 'display'))}</td>
          <td>${templateUtilities.renderNotes(proc.note, timezone)}</td>
          <td>${proc.performedDateTime ? templateUtilities.renderTime(proc.performedDateTime, timezone) : proc.performedPeriod ? templateUtilities.renderPeriod(proc.performedPeriod, timezone) : ''}</td>
        </tr>`;
    }

    // Close the HTML table
    html += `
        </tbody>
      </table>`;

    return html;
  }
}
