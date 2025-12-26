// SocialHistoryTemplate.ts - TypeScript replacement for Jinja2 socialhistory.j2
import { TemplateUtilities } from './TemplateUtilities';
import { TDomainResource } from '../../../types/resources/DomainResource';
import { TObservation } from '../../../types/resources/Observation';
import { ISummaryTemplate } from './interfaces/ITemplate';
import { TComposition } from '../../../types/resources/Composition';

/**
 * Class to generate HTML narrative for Social History (Observation resources)
 * This replaces the Jinja2 socialhistory.j2 template
 */
export class SocialHistoryTemplate implements ISummaryTemplate {
  /**
   * Generate HTML narrative for Social History
   * @param resources - FHIR Observation resources
   * @param timezone - Optional timezone to use for date formatting (e.g., 'America/New_York', 'Europe/London')
   * @returns HTML string for rendering
   */
  generateNarrative(resources: TDomainResource[], timezone: string | undefined): string {
    return SocialHistoryTemplate.generateStaticNarrative(resources, timezone);
  }

  /**
   * Generate HTML narrative for social history using summary
   * @param resources - FHIR Composition resources
   * @param timezone - Optional timezone to use for date formatting (e.g., 'America/New_York', 'Europe/London')
   * @returns HTML string for rendering
   */
  generateSummaryNarrative(resources: TComposition[], timezone: string | undefined): string | undefined {
    const templateUtilities = new TemplateUtilities(resources);
    let isSummaryCreated = false;

    let html = `<p>This list includes all information about the patient's social history, sorted by effective date (most recent first).</p>\n`;

    html += `
      <div>
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Code (System)</th>
              <th>Result</th>
              <th>Date</th>
              <th>Comments</th>
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
            data[columnTitle] = templateUtilities.renderTextAsHtml(columnData.text?.div ?? '');
          }
        }

        // Skip if Social History Name is unknown
        if (data['Social History Name']?.toLowerCase() === 'unknown') {
          continue;
        }

        isSummaryCreated = true;

        html += `
          <tr>
            <td>${templateUtilities.capitalizeFirstLetter(data['Social History Name'] ?? '')}</td>
            <td>${data['codeSystem'] ?? ''}</td>
            <td>${templateUtilities.extractObservationSummaryValue(data, timezone) ?? ''}</td>
            <td>${templateUtilities.extractObservationSummaryEffectiveTime(data, timezone) ?? ''}</td>
            <td>${data['Notes'] ?? ''}</td>
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

    const observations =
      resources.map(entry => entry as TObservation) || [];

    observations.sort((a, b) => {
      const dateA = a.effectiveDateTime || a.effectivePeriod?.start;
      const dateB = b.effectiveDateTime || b.effectivePeriod?.start;
      return dateA && dateB
        ? new Date(dateB).getTime() - new Date(dateA).getTime()
        : 0;
    });

    let html = `<p>This list includes all information about the patient's social history, sorted by effective date (most recent first).</p>\n`;

    // Start building the HTML table
    html += `
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Code (System)</th>
            <th>Result</th>
            <th>Unit</th>
            <th>Comments</th>
            <th>Date</th>
          </tr>
        </thead>
        <tbody>`;

    const addedObservations = new Set<string>();
    // Loop through entries in the resources
    for (const obs of observations) {
      // Add a table row for this observation
      const obsName = templateUtilities.renderTextAsHtml(templateUtilities.codeableConceptDisplay(obs.code));
      if (!addedObservations.has(obsName)) {
        // Skip if observation name is unknown
        if (obsName?.toLowerCase() === 'unknown') {
          continue;
        }
        addedObservations.add(obsName);
        html += `
            <tr>
              <td>${templateUtilities.capitalizeFirstLetter(obsName)}</td>
              <td>${templateUtilities.codeableConceptCoding(obs.code)}</td>
              <td>${templateUtilities.extractObservationValue(obs)}</td>
              <td>${templateUtilities.extractObservationValueUnit(obs)}</td>
              <td>${templateUtilities.renderNotes(obs.note, timezone)}</td>
              <td>${obs.effectiveDateTime ? templateUtilities.renderTime(obs.effectiveDateTime, timezone) : obs.effectivePeriod ? templateUtilities.renderPeriod(obs.effectivePeriod, timezone) : ''}</td>
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
