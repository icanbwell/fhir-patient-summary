// PregnancyTemplate.ts - TypeScript replacement for Jinja2 pregnancy.j2
import { TemplateUtilities } from './TemplateUtilities';
import { TBundle } from '../../../types/resources/Bundle';
import { TObservation } from '../../../types/resources/Observation';

/**
 * Class to generate HTML narrative for Pregnancy (Observation resources)
 * This replaces the Jinja2 pregnancy.j2 template
 */
export class PregnancyTemplate {
  /**
   * Generate HTML narrative for Pregnancy
   * @param resource - FHIR Bundle containing Observation resources
   * @returns HTML string for rendering
   */
  static generateNarrative(resource: TBundle): string {
    // Start building the HTML table
    let html = `
      <h5>Pregnancy</h5>
      <table class="hapiPropertyTable">
        <thead>
          <tr>
            <th>Code</th>
            <th>Result</th>
            <th>Comments</th>
            <th>Date</th>
          </tr>
        </thead>
        <tbody>`;

    // Check if we have entries in the bundle
    if (resource.entry && Array.isArray(resource.entry)) {
      // Loop through entries in the bundle
      for (const entry of resource.entry) {
        const obs = entry.resource as TObservation;

        // Skip Composition resources
        if (obs.resourceType === 'Composition') {
          continue;
        }

        // Find the narrative link extension if it exists
        let narrativeLinkId = '';
        if (obs.extension && Array.isArray(obs.extension)) {
          const extension = obs.extension.find(ext =>
            ext.url === 'http://hl7.org/fhir/StructureDefinition/narrativeLink'
          );
          narrativeLinkId = TemplateUtilities.narrativeLinkId(extension);
        }

        // Add a table row for this observation
        html += `
          <tr id="${narrativeLinkId}">
            <td>${TemplateUtilities.codeableConcept(obs.code, 'display')}</td>
            <td>${TemplateUtilities.renderValue(obs.value)}</td>
            <td>${TemplateUtilities.safeConcat(obs.note, 'text')}</td>
            <td>${TemplateUtilities.renderEffective(obs.effectiveDateTime)}</td>
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
