// ImmunizationsTemplate.ts - TypeScript replacement for Jinja2 immunizations.j2
import { TemplateUtilities } from './TemplateUtilities';
import { TBundle } from '../../../types/resources/Bundle';
import { TImmunization } from '../../../types/resources/Immunization';

/**
 * Class to generate HTML narrative for Immunization resources
 * This replaces the Jinja2 immunizations.j2 template
 */
export class ImmunizationsTemplate {
  /**
   * Generate HTML narrative for Immunization resources
   * @param resource - FHIR Bundle containing Immunization resources
   * @returns HTML string for rendering
   */
  static generateNarrative(resource: TBundle): string {
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
          const narrativeLinkId = TemplateUtilities.narrativeLinkId(imm);

          // Add a table row for this immunization
          html += `
            <tr id="${narrativeLinkId}">
              <td>${TemplateUtilities.codeableConcept(imm.vaccineCode)}</td>
              <td>${imm.status || ''}</td>
              <td>${TemplateUtilities.concatDoseNumber(imm.protocolApplied)}</td>
              <td>${TemplateUtilities.renderVaccineManufacturer(imm)}</td>
              <td>${imm.lotNumber || ''}</td>
              <td>${TemplateUtilities.safeConcat(imm.note, 'text')}</td>
              <td>${TemplateUtilities.renderTime(imm.occurrence)}</td>
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
