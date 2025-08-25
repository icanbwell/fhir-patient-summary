// DiagnosticResultsTemplate.ts - TypeScript replacement for Jinja2 diagnosticresults.j2
import {TemplateUtilities} from './TemplateUtilities';
import {TDomainResource} from '../../../types/resources/DomainResource';
import {TObservation} from '../../../types/resources/Observation';
import {TDiagnosticReport} from '../../../types/resources/DiagnosticReport';
import {ITemplate} from './interfaces/ITemplate';

/**
 * Class to generate HTML narrative for Diagnostic Results (Observation resources)
 * This replaces the Jinja2 diagnosticresults.j2 template
 */
export class DiagnosticResultsTemplate implements ITemplate {
  /**
   * Generate HTML narrative for Diagnostic Results
   * @param resources - FHIR resources array containing Observation and DiagnosticReport resources
   * @param timezone - Optional timezone to use for date formatting (e.g., 'America/New_York', 'Europe/London')
   * @returns HTML string for rendering
   */
  generateNarrative(resources: TDomainResource[], timezone: string | undefined): string {
    return DiagnosticResultsTemplate.generateStaticNarrative(resources, timezone);
  }

  /**
   * Internal static implementation that actually generates the narrative
   * @param resources - FHIR resources array containing Observation and DiagnosticReport resources
   * @param timezone - Optional timezone to use for date formatting (e.g., 'America/New_York', 'Europe/London')
   * @returns HTML string for rendering
   */
  private static generateStaticNarrative(resources: TDomainResource[], timezone: string | undefined): string {
    const templateUtilities = new TemplateUtilities(resources);
    let html = '';

    // Generate Observations section if we have any Observation resources
    const observations = this.getObservations(resources);
    if (observations.length > 0) {
      // sort observations by date descending
      observations.sort((a, b) => {
        const dateA = a.effectiveDateTime || a.effectivePeriod?.start;
        const dateB = b.effectiveDateTime || b.effectivePeriod?.start;
        return dateA && dateB ? new Date(dateB).getTime() - new Date(dateA).getTime() : 0;
      });
      html += this.renderObservations(templateUtilities, observations, timezone);
    }

    // Generate DiagnosticReports section if we have any DiagnosticReport resources
    const diagnosticReports = this.getDiagnosticReports(resources);
    if (diagnosticReports.length > 0) {
      // sort diagnostic reports by date descending
      diagnosticReports.sort((a, b) => {
        const dateA = a.issued;
        const dateB = b.issued;
        return dateA && dateB ? new Date(dateB).getTime() - new Date(dateA).getTime() : 0;
      });
      html += this.renderDiagnosticReports(templateUtilities, diagnosticReports, timezone);
    }

    return html;
  }

    /**
   * Get all Observation resources from the resource array
   * @param resources - FHIR resources array
   * @returns Array of Observation resources
   */
  private static getObservations(resources: TDomainResource[]): Array<TObservation> {
    return resources
      .filter(resourceItem => resourceItem.resourceType === 'Observation')
      .map(resourceItem => resourceItem as TObservation);
  }

  /**
   * Get all DiagnosticReport resources from the resource array
   * @param resources - FHIR resources array
   * @returns Array of DiagnosticReport resources
   */
  private static getDiagnosticReports(resources: TDomainResource[]): Array<TDiagnosticReport> {
    return resources
      .filter(resourceItem => resourceItem.resourceType === 'DiagnosticReport')
      .map(resourceItem => resourceItem as TDiagnosticReport);
  }

  /**
   * Render HTML table for Observation resources
   * @param templateUtilities - Instance of TemplateUtilities for utility functions
   * @param observations - Array of Observation resources
   * @param timezone - Optional timezone to use for date formatting
   * @returns HTML string for rendering
   */
  private static renderObservations(templateUtilities: TemplateUtilities, observations: Array<TObservation>, timezone: string | undefined): string {
    let html = `
      <h3>Observations</h3>
      <table>
        <thead>
          <tr>
            <th>Code</th>
            <th>Result</th>
            <th>Unit</th>
            <th>Interpretation</th>
            <th>Reference Range</th>
            <th>Comments</th>
            <th>Date</th>
          </tr>
        </thead>
        <tbody>`;

    for (const obs of observations) {
      // Use the enhanced narrativeLinkId utility function to extract the ID directly from the resource
      // Add table row
      html += `
        <tr id="${templateUtilities.narrativeLinkId(obs)}">
          <td>${templateUtilities.codeableConcept(obs.code)}</td>
          <td>${templateUtilities.extractObservationValue(obs)}</td>
          <td>${templateUtilities.extractObservationValueUnit(obs)}</td>
          <td>${templateUtilities.firstFromCodeableConceptList(obs.interpretation)}</td>
          <td>${templateUtilities.concatReferenceRange(obs.referenceRange)}</td>
          <td>${templateUtilities.renderNotes(obs.note, timezone)}</td>
          <td>${obs.effectiveDateTime ? templateUtilities.renderTime(obs.effectiveDateTime, timezone) : obs.effectivePeriod ? templateUtilities.renderPeriod(obs.effectivePeriod, timezone) : ''}</td>
        </tr>`;
    }

    html += `
        </tbody>
      </table>`;

    return html;
  }

  /**
   * Render HTML table for DiagnosticReport resources
   * @param templateUtilities - Instance of TemplateUtilities for utility functions
   * @param reports - Array of DiagnosticReport resources
   * @param timezone - Optional timezone to use for date formatting
   * @returns HTML string for rendering
   */
  private static renderDiagnosticReports(templateUtilities: TemplateUtilities, reports: Array<TDiagnosticReport>, timezone: string | undefined): string {
    let html = `
      <h3>Diagnostic Reports</h3>
      <table>
        <thead>
          <tr>
            <th>Report</th>
            <th>Category</th>
            <th>Result</th>
            <th>Issued</th>
          </tr>
        </thead>
        <tbody>`;

    for (const report of reports) {
      // Use the enhanced narrativeLinkId utility function to extract the ID directly from the resource
      // Format result count
      let resultCount = '';
      if (report.result && Array.isArray(report.result)) {
        resultCount = `${report.result.length} result${report.result.length !== 1 ? 's' : ''}`;
      }

      // Add table row
      html += `
        <tr id="${(templateUtilities.narrativeLinkId(report))}">
          <td>${templateUtilities.codeableConcept(report.code)}</td>
          <td>${templateUtilities.firstFromCodeableConceptList(report.category)}</td>
          <td>${resultCount}</td>
          <td>${report.issued ? templateUtilities.renderTime(report.issued, timezone) : ''}</td>
        </tr>`;
    }

    html += `
        </tbody>
      </table>`;

    return html;
  }
}
