// ImmunizationsTemplate.ts - TypeScript replacement for Jinja2 immunizations.j2
import {TemplateUtilities} from './TemplateUtilities';
import {TDomainResource} from '../../../types/resources/DomainResource';
import {TImmunization} from '../../../types/resources/Immunization';
import {ISummaryTemplate} from './interfaces/ITemplate';
import { TComposition } from '../../../types/resources/Composition';

/**
 * Class to generate HTML narrative for Immunization resources
 * This replaces the Jinja2 immunizations.j2 template
 */
export class ImmunizationsTemplate implements ISummaryTemplate {
  /**
   * Generate HTML narrative for Immunization resources
   * @param resources - FHIR resources array containing Immunization resources
   * @param timezone - Optional timezone to use for date formatting (e.g., 'America/New_York', 'Europe/London')
   * @returns HTML string for rendering
   */
  generateNarrative(resources: TDomainResource[], timezone: string | undefined): string {
    // Get immunizations from the resources array and sort by date in descending order
    resources.sort((a, b) => {
      const dateA = (a as TImmunization).occurrenceDateTime;
      const dateB = (b as TImmunization).occurrenceDateTime;
      return (typeof dateA === 'string' && typeof dateB === 'string')
        ? new Date(dateB).getTime() - new Date(dateA).getTime()
        : 0;
    });

    return ImmunizationsTemplate.generateStaticNarrative(resources, timezone);
  }

  /**
   * Generate HTML narrative for Immunization resources using summary
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
      <p>This list includes all vaccinations, sorted by occurrence date (most recent first).</p>
        <table>
          <thead>
            <tr>
              <th>Immunization</th>
              <th>Code (System)</th>
              <th>Status</th>
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
            case 'Immunization Name':
              data['immunization'] = templateUtilities.renderTextAsHtml(columnData.text?.div ?? '');
              break;
            case 'Status':
              data['status'] = templateUtilities.renderTextAsHtml(columnData.text?.div ?? '');
              break;
            case 'occurrenceDateTime':
              data['occurrenceDateTime'] = templateUtilities.renderTextAsHtml(columnData.text?.div ?? '');
              break;
            default:
              break;
          }
        }

        if (data['status'] === 'completed') {
          // Skip if immunization name is unknown
          if (data['immunization']?.toLowerCase() === 'unknown') {
            continue;
          }
          isSummaryCreated = true;
          html += `
              <tr>
                <td>${templateUtilities.capitalizeFirstLetter(data['immunization'] ?? '')}</td>
                <td>${data['codeSystem'] ?? ''}</td>
                <td>${data['status'] ?? ''}</td>
                <td>${templateUtilities.renderTime(data['occurrenceDateTime'], timezone) ?? ''}</td>
              </tr>`;
        }
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
   * @param resources - FHIR resources array containing Immunization resources
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
            <th>Immunization</th>
            <th>Code (System)</th>
            <th>Status</th>
            <th>Dose Number</th>
            <th>Manufacturer</th>
            <th>Lot Number</th>
            <th>Comments</th>
            <th>Date</th>
          </tr>
        </thead>
        <tbody>`;

    // Check if we have Immunization resources
    const immunizations = resources.filter(resourceItem => resourceItem.resourceType === 'Immunization');

    if (immunizations.length > 0) {
      // Loop through Immunization resources
      for (const resourceItem of immunizations) {
        const imm = resourceItem as TImmunization;
        // Skip if immunization name is unknown
        const immunizationName = templateUtilities.codeableConceptDisplay(imm.vaccineCode);
        if (immunizationName?.toLowerCase() === 'unknown') {
          continue;
        }
        html += `
          <tr>
            <td>${templateUtilities.capitalizeFirstLetter(templateUtilities.renderTextAsHtml(immunizationName))}</td>
            <td>${templateUtilities.codeableConceptCoding(imm.vaccineCode)}</td>
            <td>${imm.status || ''}</td>
            <td>${templateUtilities.concatDoseNumber(imm.protocolApplied)}</td>
            <td>${templateUtilities.renderVaccineManufacturer(imm)}</td>
            <td>${imm.lotNumber || ''}</td>
            <td>${templateUtilities.renderNotes(imm.note, timezone)}</td>
            <td>${templateUtilities.renderTime(imm.occurrenceDateTime, timezone)}</td>
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
