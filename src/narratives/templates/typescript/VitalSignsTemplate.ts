// VitalSignsTemplate.ts - TypeScript replacement for Jinja2 vitalsigns.j2
import { TemplateUtilities } from './TemplateUtilities';
import { TDomainResource } from '../../../types/resources/DomainResource';
import { TObservation } from '../../../types/resources/Observation';
import { ISummaryTemplate } from './interfaces/ITemplate';
import { TComposition } from '../../../types/resources/Composition';
import { VITAL_SIGNS_SUMMARY_COMPONENT_MAP } from '../../../structures/ips_section_constants';

/**
 * Class to generate HTML narrative for Vital Signs (Observation resources)
 * This replaces the Jinja2 vitalsigns.j2 template
 */
export class VitalSignsTemplate implements ISummaryTemplate {
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
   * Generate HTML narrative for vital signs using summary
   * @param resources - FHIR Composition resources
   * @param timezone - Optional timezone to use for date formatting (e.g., 'America/New_York', 'Europe/London')
   * @returns HTML string for rendering
   */
  generateSummaryNarrative(resources: TComposition[], timezone: string | undefined): string | undefined {
    const templateUtilities = new TemplateUtilities(resources);
    let isSummaryCreated = false;

    let html = `<p>This list includes the latest vital signs, sorted by effective date (most recent first).</p>\n`;

    html += `
      <div>
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Code (System)</th>
              <th>Result</th>
              <th>Date</th>
              <th>Source</th>
            </tr>
          </thead>
          <tbody>`;
    
    for (const resourceItem of resources) {
      for (const rowData of resourceItem.section ?? []) {
        const sectionCodeableConcept = rowData.code;
        const data: Record<string, string> = {};
        data["codeSystem"] = templateUtilities.codeableConceptCoding(sectionCodeableConcept);
        for (const columnData of rowData.section ?? []) {
          const columnTitle = columnData.title;
          if (columnTitle) {
            if (
              Object.keys(VITAL_SIGNS_SUMMARY_COMPONENT_MAP).includes(
                columnTitle
              )
            ) {
              const vitalData: Record<string, string> = {};
              for (const component of columnData.section?.[0]?.section ?? []) {
                if (component.title) {
                    vitalData[component.title] = templateUtilities.renderTextAsHtml(component.text?.div ?? '');
                }
              }
              const vitalValue =
                templateUtilities.extractObservationSummaryValue(
                  vitalData,
                  timezone
                );
              if (vitalValue) {
                const dataKey =
                  VITAL_SIGNS_SUMMARY_COMPONENT_MAP[
                    columnTitle as keyof typeof VITAL_SIGNS_SUMMARY_COMPONENT_MAP
                  ] ?? VITAL_SIGNS_SUMMARY_COMPONENT_MAP['Default'];
                data[dataKey] = vitalValue;
              }
            }
            data[columnTitle] = templateUtilities.renderTextAsHtml(columnData.text?.div ?? '');
          }
        }

        isSummaryCreated = true;

        html += `
          <tr>
            <td>${data['Vital Name'] ?? ''}</td>
            <td>${data['codeSystem'] ?? ''}</td>
            <td>${templateUtilities.extractObservationSummaryValue(data, timezone) ?? ''}</td>
            <td>${templateUtilities.extractObservationSummaryEffectiveTime(data, timezone) ?? ''}</td>
            <td>${data['Source'] ?? ''}</td>
          </tr>`;
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
   * @param resources - FHIR Observation resources
   * @param timezone - Optional timezone to use for date formatting (e.g., 'America/New_York', 'Europe/London')
   * @returns HTML string for rendering
   */
  private static generateStaticNarrative(
    resources: TDomainResource[],
    timezone: string | undefined
  ): string {
    const templateUtilities = new TemplateUtilities(resources);

    const observations: TObservation[] =
      resources.map(entry => entry as TObservation) || [];

    observations.sort((a, b) => {
      const dateA = a.effectiveDateTime || a.effectivePeriod?.start;
      const dateB = b.effectiveDateTime || b.effectivePeriod?.start;
      return dateA && dateB
        ? new Date(dateB).getTime() - new Date(dateA).getTime()
        : 0;
    });

    let html = `<p>This list includes the latest vital signs, sorted by effective date (most recent first).</p>\n`;

    // Start building the HTML table
    html += `
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Code (System)</th>
            <th>Result</th>
            <th>Unit</th>
            <th>Interpretation</th>
            <th>Component(s)</th>
            <th>Comments</th>
            <th>Date</th>
            <th>Source</th>
          </tr>
        </thead>
        <tbody>`;

    // Loop through entries in the resources
    for (const obs of observations) {
      // Use the enhanced narrativeLinkId utility function to extract the ID directly from the resource
      // Add a table row for this observation
      html += `
          <tr id="${templateUtilities.narrativeLinkId(obs)}">
            <td>${templateUtilities.renderTextAsHtml(templateUtilities.codeableConceptDisplay(obs.code, 'display'))}</td>
            <td>${templateUtilities.codeableConceptCoding(obs.code)}</td>
            <td>${templateUtilities.extractObservationValue(obs)}</td>
            <td>${templateUtilities.extractObservationValueUnit(obs)}</td>
            <td>${templateUtilities.firstFromCodeableConceptList(obs.interpretation)}</td>
            <td>${templateUtilities.renderComponent(obs.component)}</td>
            <td>${templateUtilities.renderNotes(obs.note, timezone)}</td>
            <td>${obs.effectiveDateTime ? templateUtilities.renderTime(obs.effectiveDateTime, timezone) : obs.effectivePeriod ? templateUtilities.renderPeriod(obs.effectivePeriod, timezone) : ''}</td>
            <td>${templateUtilities.getOwnerTag(obs)}</td>
          </tr>`;
    }

    // Close the HTML table
    html += `
        </tbody>
      </table>`;

    return html;
  }
}
