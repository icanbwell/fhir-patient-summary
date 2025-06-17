// AllergyIntoleranceTemplate.ts - TypeScript replacement for Jinja2 allergyintolerance.j2
import { TemplateUtilities } from './TemplateUtilities';
import { TBundle } from '../../../types/resources/Bundle';
import { TAllergyIntolerance } from '../../../types/resources/AllergyIntolerance';

/**
 * Class to generate HTML narrative for AllergyIntolerance resources
 * This replaces the Jinja2 allergyintolerance.j2 template
 */
export class AllergyIntoleranceTemplate {
  /**
   * Generate HTML narrative for AllergyIntolerance resources
   * @param resource - FHIR Bundle containing AllergyIntolerance resources
   * @returns HTML string for rendering
   */
  static generateNarrative(resource: TBundle): string {
        const templateUtilities = new TemplateUtilities(resource);
    // Start building the HTML table for allergies and intolerances
    let html = `
      <h5>Allergies And Intolerances</h5>
      <table class="hapiPropertyTable">
        <thead>
          <tr>
            <th>Allergen</th>
            <th>Status</th>
            <th>Category</th>
            <th>Reaction</th>
            <th>Severity</th>
            <th>Comments</th>
            <th>Onset</th>
          </tr>
        </thead>
        <tbody>`;

    // Check if we have entries in the bundle
    if (resource.entry && Array.isArray(resource.entry)) {
      // Loop through entries in the bundle
      for (const entry of resource.entry) {
        const allergy = entry.resource as TAllergyIntolerance;

        // Find the narrative link extension if it exists
        let narrativeLinkId = '';
        if (allergy.extension && Array.isArray(allergy.extension)) {
          const extension = allergy.extension.find(ext =>
            ext.url === 'http://hl7.org/fhir/StructureDefinition/narrativeLink'
          );
          narrativeLinkId = templateUtilities.narrativeLinkId(extension);
        }

        // Add a table row for this allergy
        html += `
          <tr id="${narrativeLinkId}">
            <td>${templateUtilities.codeableConcept(allergy.code)}</td>
            <td>${templateUtilities.codeableConcept(allergy.clinicalStatus)}</td>
            <td>${templateUtilities.safeConcat(allergy.category, 'value')}</td>
            <td>${templateUtilities.concatReactionManifestation(allergy.reaction)}</td>
            <td>${templateUtilities.safeConcat(allergy.reaction, 'severity')}</td>
            <td>${templateUtilities.safeConcat(allergy.note, 'text')}</td>
            <td>${templateUtilities.renderTime(allergy.onsetDateTime)}</td>
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
