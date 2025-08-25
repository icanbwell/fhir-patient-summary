// VitalSignsTemplate.ts - TypeScript replacement for Jinja2 vitalsigns.j2
import { TemplateUtilities } from './TemplateUtilities';
import { TDomainResource } from '../../../types/resources/DomainResource';
import { TObservation } from '../../../types/resources/Observation';
import { ITemplate } from './interfaces/ITemplate';

/**
 * Class to generate HTML narrative for Vital Signs (Observation resources)
 * This replaces the Jinja2 vitalsigns.j2 template
 */
export class VitalSignsTemplate implements ITemplate {
  /**
   * Generate HTML narrative for Vital Signs
   * @param resources - FHIR Observation resources
   * @param timezone - Optional timezone to use for date formatting (e.g., 'America/New_York', 'Europe/London')
   * @returns HTML string for rendering
   */
  generateNarrative(resources: TDomainResource[], timezone: string | undefined): string {
    return VitalSignsTemplate.generateStaticNarrative(resources, timezone);
  }

  /**
   * Internal static implementation that actually generates the narrative
   * @param resources - FHIR Observation resources
   * @param timezone - Optional timezone to use for date formatting (e.g., 'America/New_York', 'Europe/London')
   * @returns HTML string for rendering
   */
  private static generateStaticNarrative(
    resources: TDomainResource[],
    timezone: string | undefined
  ): string {
    const templateUtilities = new TemplateUtilities(resources);

    const observations =
      resources.map(entry => entry as TObservation) || [];

    observations.sort((a, b) => {
      const dateA = a.effectiveDateTime || a.effectivePeriod?.start;
      const dateB = b.effectiveDateTime || b.effectivePeriod?.start;
      return dateA && dateB
        ? new Date(dateB).getTime() - new Date(dateA).getTime()
        : 0;
    });

    // Start building the HTML table
    let html = `
      <table>
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

    // Loop through entries in the resources
    for (const obs of observations) {
      // Use the enhanced narrativeLinkId utility function to extract the ID directly from the resource
      // Add a table row for this observation
      html += `
          <tr id="${templateUtilities.narrativeLinkId(obs)}">
            <td>${templateUtilities.codeableConcept(obs.code, 'display')}</td>
            <td>${templateUtilities.extractObservationValue(obs)}</td>
            <td>${templateUtilities.extractObservationValueUnit(obs)}</td>
            <td>${templateUtilities.firstFromCodeableConceptList(obs.interpretation)}</td>
            <td>${templateUtilities.renderComponent(obs.component)}</td>
            <td>${templateUtilities.renderNotes(obs.note, timezone)}</td>
            <td>${obs.effectiveDateTime ? templateUtilities.renderTime(obs.effectiveDateTime, timezone) : obs.effectivePeriod ? templateUtilities.renderPeriod(obs.effectivePeriod, timezone) : ''}</td>
          </tr>`;
    }

    // Close the HTML table
    html += `
        </tbody>
      </table>`;

    return html;
  }
}
