// PregnancyTemplate.ts - TypeScript replacement for Jinja2 pregnancy.j2
import {TemplateUtilities} from './TemplateUtilities';
import {TBundle} from '../../../types/resources/Bundle';
import {TObservation} from '../../../types/resources/Observation';
import {ITemplate} from './interfaces/ITemplate';

/**
 * Class to generate HTML narrative for Pregnancy (Observation resources)
 * This replaces the Jinja2 pregnancy.j2 template
 */
export class PregnancyTemplate implements ITemplate {
  /**
   * Generate HTML narrative for Pregnancy
   * @param resource - FHIR Bundle containing Observation resources
   * @param timezone - Optional timezone to use for date formatting (e.g., 'America/New_York', 'Europe/London')
   * @returns HTML string for rendering
   */
  generateNarrative(resource: TBundle, timezone: string | undefined): string {
    return PregnancyTemplate.generateStaticNarrative(resource, timezone);
  }

  /**
   * Internal static implementation that actually generates the narrative
   * @param resource - FHIR Bundle containing Observation resources
   * @param timezone - Optional timezone to use for date formatting (e.g., 'America/New_York', 'Europe/London')
   * @returns HTML string for rendering
   */
   
  private static generateStaticNarrative(resource: TBundle, timezone: string | undefined): string {
    const templateUtilities = new TemplateUtilities(resource);
    // Start building the HTML table
    let html = `
      <h5>Pregnancy</h5>
      <table>
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

        // Use the enhanced narrativeLinkId utility function to extract the ID directly from the resource
        // Add a table row for this observation
        html += `
          <tr id="${(templateUtilities.narrativeLinkId(obs))}">
            <td>${templateUtilities.codeableConcept(obs.code, 'display')}</td>
            <td>${templateUtilities.extractObservationValue(obs)}</td>
            <td>${templateUtilities.renderNotes(obs.note, timezone)}</td>
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
