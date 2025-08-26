// ImmunizationsTemplate.ts - TypeScript replacement for Jinja2 immunizations.j2
import {TemplateUtilities} from './TemplateUtilities';
import {TDomainResource} from '../../../types/resources/DomainResource';
import {TImmunization} from '../../../types/resources/Immunization';
import {ITemplate} from './interfaces/ITemplate';

/**
 * Class to generate HTML narrative for Immunization resources
 * This replaces the Jinja2 immunizations.j2 template
 */
export class ImmunizationsTemplate implements ITemplate {
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

        // Find the narrative link extension if it exists
        // Add a table row for this immunization
        html += `
          <tr id="${(templateUtilities.narrativeLinkId(imm))}">
            <td>${templateUtilities.codeableConcept(imm.vaccineCode)}</td>
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
