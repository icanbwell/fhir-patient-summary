// VitalSignsTemplate.ts - TypeScript replacement for Jinja2 vitalsigns.j2
import { TemplateUtilities } from './TemplateUtilities';
import { TBundle } from '../../../types/resources/Bundle';
import { TObservation } from '../../../types/resources/Observation';
import { ITemplate } from './interfaces/ITemplate';

/**
 * Class to generate HTML narrative for Vital Signs (Observation resources)
 * This replaces the Jinja2 vitalsigns.j2 template
 */
export class VitalSignsTemplate implements ITemplate {
  /**
   * Generate HTML narrative for Vital Signs
   * @param resource - FHIR Bundle containing Observation resources
   * @param timezone - Optional timezone to use for date formatting (e.g., 'America/New_York', 'Europe/London')
   * @returns HTML string for rendering
   */
  generateNarrative(resource: TBundle, timezone?: string): string {
    return VitalSignsTemplate.generateStaticNarrative(resource, timezone);
  }

  /**
   * Internal static implementation that actually generates the narrative
   * @param resource - FHIR Bundle containing Observation resources
   * @param timezone - Optional timezone to use for date formatting (e.g., 'America/New_York', 'Europe/London')
   * @returns HTML string for rendering
   */
  private static generateStaticNarrative(resource: TBundle, timezone?: string): string {
    const templateUtilities = new TemplateUtilities(resource);
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
        const narrativeLinkId = templateUtilities.narrativeLinkId(obs);

        // Add a table row for this observation
        html += `
          <tr id="${narrativeLinkId}">
            <td>${templateUtilities.codeableConcept(obs.code, 'display')}</td>
            <td>${templateUtilities.extractObservationValue(obs)}</td>
            <td>${templateUtilities.extractObservationValueUnit(obs)}</td>
            <td>${templateUtilities.firstFromCodeableConceptList(obs.interpretation)}</td>
            <td>${templateUtilities.renderComponent(obs.component)}</td>
            <td>${templateUtilities.safeConcat(obs.note, 'text')}</td>
            <td>${templateUtilities.renderEffective(obs.effectiveDateTime, timezone)}</td>
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
