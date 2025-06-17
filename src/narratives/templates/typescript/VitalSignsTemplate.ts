// VitalSignsTemplate.ts - TypeScript replacement for Jinja2 vitalsigns.j2
import { TemplateUtilities } from './TemplateUtilities';
import { TBundle } from '../../../types/resources/Bundle';
import { TObservation } from '../../../types/resources/Observation';

/**
 * Class to generate HTML narrative for Vital Signs (Observation resources)
 * This replaces the Jinja2 vitalsigns.j2 template
 */
export class VitalSignsTemplate {
  /**
   * Generate HTML narrative for Vital Signs
   * @param resource - FHIR Bundle containing Observation resources
   * @returns HTML string for rendering
   */
  static generateNarrative(resource: TBundle): string {
    // Start building the HTML table
    let html = `
      <h5>Vital Signs</h5>
      <table class="hapiPropertyTable">
        <thead>
          <tr>
            <th>Code</th>
            <th>Result</th>
            <th>Unit</th>
            <th>Interpretation</th>
            <th>Component(s)</th>
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

        // Skip composition resources
        if (obs.resourceType === 'Composition') {
          continue;
        }

        // Use the enhanced narrativeLinkId utility function to extract the ID directly from the resource
        const narrativeLinkId = TemplateUtilities.narrativeLinkId(obs);

        // Add a table row for this observation
        html += `
          <tr id="${narrativeLinkId}">
            <td>${TemplateUtilities.codeableConcept(obs.code, 'display')}</td>
            <td>${TemplateUtilities.extractObservationValue(obs)}</td>
            <td>${TemplateUtilities.extractObservationValueUnit(obs)}</td>
            <td>${TemplateUtilities.firstFromCodeableConceptList(obs.interpretation)}</td>
            <td>${TemplateUtilities.renderComponent(obs.component)}</td>
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
