// ImmunizationsTemplate.ts - TypeScript replacement for Jinja2 immunizations.j2
import {TemplateUtilities} from './TemplateUtilities';
import {TBundle} from '../../../types/resources/Bundle';
import {TImmunization} from '../../../types/resources/Immunization';
import {ITemplate} from './interfaces/ITemplate';

/**
 * Class to generate HTML narrative for Immunization resources
 * This replaces the Jinja2 immunizations.j2 template
 */
export class ImmunizationsTemplate implements ITemplate {
  /**
   * Generate HTML narrative for Immunization resources
   * @param resource - FHIR Bundle containing Immunization resources
   * @param timezone - Optional timezone to use for date formatting (e.g., 'America/New_York', 'Europe/London')
   * @returns HTML string for rendering
   */
  generateNarrative(resource: TBundle, timezone: string | undefined): string {
    return ImmunizationsTemplate.generateStaticNarrative(resource, timezone);
  }

  /**
   * Internal static implementation that actually generates the narrative
   * @param resource - FHIR Bundle containing Immunization resources
   * @param timezone - Optional timezone to use for date formatting (e.g., 'America/New_York', 'Europe/London')
   * @returns HTML string for rendering
   */
  private static generateStaticNarrative(resource: TBundle, timezone: string | undefined): string {
    const templateUtilities = new TemplateUtilities(resource);
    // Start building the HTML table
    let html = `
      <h5>Immunizations</h5>
      <table class="hapiPropertyTable">
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

    // Check if we have entries in the bundle
    if (resource.entry && Array.isArray(resource.entry)) {
      // Loop through entries to find Immunization resources
      for (const entry of resource.entry) {
        if (entry.resource?.resourceType === 'Immunization') {
          const imm = entry.resource as TImmunization;

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
    }

    // Close the HTML table
    html += `
        </tbody>
      </table>`;

    return html;
  }
}
